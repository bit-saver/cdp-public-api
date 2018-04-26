import aws from '../services/amazon-aws';
import cloudflare from '../services/cloudflare';
import Download from '../api/modules/download';
import * as utils from '../api/modules/utils';
import { exec as mediainfo } from 'mediainfo-parser';

const downloadAsset = async ( url, requestId ) => {
  const download = await Download( url, requestId );
  return download;
};

const uploadAsset = async ( reqBody, download ) => {
  let d = null;
  if ( reqBody.published ) d = new Date( reqBody.published );
  else d = new Date(); // use current date as fallback
  let month = d.getMonth() + 1; // month is a 0 based index
  if ( month < 10 ) month = `0${month}`; // leading 0
  const title = `${d.getFullYear()}/${month}/${reqBody.site}_${reqBody.post_id}/${
    download.props.md5
  }`;
  const result = await aws.upload( {
    title,
    ext: download.props.ext,
    filePath: download.filePath
  } );
  return result;
};

const uploadStream = async ( download ) => {
  const result = await cloudflare.upload( download.filePath );
  return result;
};

/**
 * Same as uploadStream but always resolves instead of rejecting due to errors.
 * Errors are reported in console.
 *
 * @param download
 * @param asset
 * @returns {Promise<any>}
 */
const uploadStreamAsync = ( download, asset ) => {
  console.log(
    'uploadStreamAsync download and asset',
    '\r\n',
    JSON.stringify( download, null, 2 ),
    JSON.stringify( asset, null, 2 )
  );
  return new Promise( ( resolve ) => {
    cloudflare
      .upload( download.filePath )
      .then( ( result ) => {
        resolve( { asset, ...result } );
      } )
      .catch( ( err ) => {
        console.error( 'uploadStreamSync error', err );
        resolve( null );
      } );
  } );
};

const getVideoProperties = download =>
  new Promise( ( resolve, reject ) => {
    mediainfo( download.filePath, ( err, result ) => {
      if ( err ) {
        console.error( 'MEDIAINFO ENCOUNTERED AN ERROR', '\r\n', err );
        return resolve( null );
      }
      if ( result.media.track.length < 1 ) return reject( new Error( 'No media info.' ) );
      const props = {
        size: {
          width: null,
          height: null,
          filesize: null,
          bitrate: null
        },
        duration: null
      };
      result.media.track.forEach( ( data ) => {
        if ( data._type === 'General' ) {
          props.size.filesize = data.filesize;
          props.size.bitrate = data.overallbitrate;
          props.duration = data.duration;
        } else if ( data._type === 'Video' ) {
          props.size.width = data.width;
          props.size.height = data.height;
        }
      } );
      console.log( 'mediainfo', JSON.stringify( props, null, 2 ) );
      resolve( props );
    } );
  } );

const updateAsset = ( model, asset, result, md5 ) => {
  // Modify the original request by:
  // replacing the downloadUrl and adding a checksum
  model.putAsset( {
    ...asset,
    downloadUrl: result.Location || '',
    stream: result.stream || null,
    size: result.size || null,
    duration: result.duration || null,
    md5
  } );
};

const deleteAssets = ( assets ) => {
  assets.forEach( ( asset ) => {
    if ( asset.url ) aws.remove( asset );
    if ( asset.stream && asset.stream.uid ) {
      cloudflare.remove( asset.stream.uid );
    }
  } );
};

/**
 * Uses the Content-Type defined in the header of a response
 * from the provided URL. If the Content-Type found in the header
 * is in the list of allowed content types then true is returned.
 *
 * @param url
 * @returns {Promise<boolean>}
 */
const isTypeAllowed = async ( url ) => {
  const contentType = await utils.getTypeFromUrl( url );
  if ( !contentType ) return false;
  const allowedTypes = utils.getContentTypes();
  return allowedTypes.includes( contentType );
};

/**
 * If a downloadUrl is present, return a Promise that contains the process
 * for uploading an asset to S3 as well as Cloudflare Stream (if video).
 * If the env variable CF_STREAM_ASYNC is true, the Cloudflare stream process will
 * be placed into the request property asyncTransfers so that it can complete
 * after the response is sent (in case of errors and prolonged process time).
 *
 * @param model
 * @param asset
 * @returns {Promise<any>}
 */
const transferAsset = ( model, asset ) => {
  if ( asset.downloadUrl ) {
    return new Promise( async ( resolve, reject ) => {
      let download = null;
      let updateNeeded = false;
      console.info( 'downloading', asset.downloadUrl );

      const allowed = await isTypeAllowed( asset.downloadUrl );
      if ( allowed && asset.md5 ) {
        // Since we have an md5 in the request, check to see if is already present
        // in the ES model assets and if so, no update needed.
        updateNeeded = model.updateIfNeeded( asset, asset.md5 );
        if ( !updateNeeded ) return resolve( { message: 'Update not required (md5 pre match).' } );
      }
      if ( allowed ) {
        // eslint-disable-next-line max-len
        download = await downloadAsset( asset.downloadUrl, model.getRequestId() ).catch( ( err ) => {
          console.error( err );
          return err;
        } );
        if ( download instanceof Error ) return reject( download );
        model.putAsset( { ...asset, md5: download.props.md5 } );
      } else return reject( new Error( `Content type not allowed for asset: ${asset.downloadUrl}` ) );

      // Attempt to find matching asset in ES document
      if ( !updateNeeded ) updateNeeded = model.updateIfNeeded( asset, download.props.md5 );
      if ( !updateNeeded ) {
        console.log( 'md5 match, update not required' );
        resolve( { message: 'Update not required.' } );
      } else {
        console.log( 'need to update' );
        const uploads = [];
        uploads.push( uploadAsset( model.body, download ) );
        if ( download.props.contentType.startsWith( 'video' ) ) {
          const size = await getVideoProperties( download ).catch( ( err ) => {
            uploads.push( Promise.reject( err ) );
          } );
          if ( size ) {
            const maxSize = ( process.env.CF_MAX_SIZE || 1024 ) * 1024 * 1024;
            const fileSize = size.size.filesize;
            if ( fileSize < maxSize ) {
              // Test the env variable for true or if not set, assume true
              if ( /^true/.test( process.env.CF_STREAM_ASYNC || 'true' ) ) {
                model.putAsyncTransfer( uploadStreamAsync( download, {
                  ...asset,
                  md5: download.props.md5
                } ) ); // eslint-disable-line max-len
              } else uploads.push( uploadStream( download ) );
            } else {
              console.log( `Upload too large for cloudflare: maxSize ${maxSize} fileSize ${fileSize}` );
            }
            uploads.push( Promise.resolve( size ) );
          }
        }

        Promise.all( uploads )
          .then( ( results ) => {
            let result = {};
            results.forEach( ( data ) => {
              if ( data ) result = { ...result, ...data };
            } );
            updateAsset( model, asset, result, download.props.md5 );
            resolve( result );
          } )
          .catch( ( err ) => {
            console.error( err );
            return reject( err );
          } );
      }
    } );
  }
};

/**
 * Generates a "transfer" middleware that serves as an intermediary
 * between an index/update request and the actual ES action.
 * This step downloads the file and uploads it to S3.
 *
 * @param Model AbstractModel
 */
export const transferCtrl = Model => async ( req, res, next ) => {
  console.log( 'TRANSFER CONTROLLER INIT', req.requestId );
  let reqAssets = [];
  const transfers = []; // Promise array (holds all download/upload processes)

  const model = new Model();

  try {
    // verify that we are operating on a single, unique document
    reqAssets = await model.prepareDocumentForUpdate( req );
  } catch ( err ) {
    // need 'return' in front of next as next will NOT stop current execution
    return next( err );
  }

  reqAssets.forEach( ( asset ) => {
    transfers.push( transferAsset( model, asset ) );
  } );

  // Once all promises resolve, pass request onto ES controller
  await Promise.all( transfers )
    .then( () => {
      const s3FilesToDelete = model.getFilesToRemove();
      if ( s3FilesToDelete.length ) deleteAssets( s3FilesToDelete );
      console.log( 'TRANSFER CTRL NEXT', req.requestId );
      next();
    } )
    .catch( ( err ) => {
      console.log( 'caught transfer error', err );
      next( err );
    } );
};

/**
 * Generates a second transfer middleware that finishes any transfers that were
 * set aside for processing AFTER the request response was sent. Mainly this is
 * for Cloudflare Stream uploads since it isn't as reliable (currently in beta).
 * If there are transfers, it will update each asset and then pass it to a 2nd
 * index controller.
 *
 * @param Model
 * @returns {function(*=, *, *)}
 */
export const asyncTransferCtrl = Model => async ( req, res, next ) => {
  console.log( 'ASYNC TRANSFER CONTROLLER INIT', req.requestId );
  if ( !req.asyncTransfers || req.asyncTransfers.length < 1 ) return next();

  let updated = false;
  const model = new Model();

  await Promise.all( req.asyncTransfers ).then( async ( results ) => {
    try {
      await model.prepareDocumentForPatch( req );
    } catch ( err ) {
      console.error( err );
      return null;
    }
    results.forEach( ( result ) => {
      if ( result ) {
        // Let's nullify unitIndex and srcIndex so that putAsset has to rely on md5
        // in case this document changed.
        console.log( 'putting CF asset result', '\r\n', JSON.stringify( result, null, 2 ) );
        model.putAsset( {
          ...result.asset,
          stream: result.stream,
          unitIndex: null,
          srcIndex: null
        } );
        updated = true;
      }
    } );
    if ( updated ) next();
  } );
};

export const deleteCtrl = Model => async ( req, res, next ) => {
  const model = new Model();
  let esAssets = [];

  try {
    // verify that we are operating on a single, unique document
    esAssets = await model.prepareDocumentForDelete( req );
  } catch ( err ) {
    // need 'return' in front of next as next will NOT stop current execution
    return next( err );
  }

  const urlsToRemove = esAssets
    .filter( asset => asset.downloadUrl || asset.stream )
    .map( asset => ( { url: asset.downloadUrl, stream: asset.stream } ) );

  deleteAssets( urlsToRemove );
  next();
};
