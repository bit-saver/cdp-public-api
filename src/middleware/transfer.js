import aws from '../services/amazon-aws';
import Download from '../api/modules/download';
import * as utils from '../api/modules/utils';

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
  if ( !assets || assets.length < 1 ) return;
  assets.forEach( ( asset ) => {
    if ( asset.url ) aws.remove( asset );
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
 * @param req
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
        if ( download instanceof Error ) return resolve( download );
        model.putAsset( { ...asset, md5: download.props.md5 } );
      } else return resolve( new Error( `Content type not allowed for asset: ${asset.downloadUrl}` ) );

      // Attempt to find matching asset in ES document
      if ( !updateNeeded ) updateNeeded = model.updateIfNeeded( asset, download.props.md5 );
      if ( !updateNeeded ) {
        console.log( 'Matched md5, update not required: ', download.props.md5 );
        resolve( { message: 'Update not required.' } );
      } else {
        console.log( 'Update required for download hash: ', download.props.md5 );
        const uploads = [];
        uploads.push( uploadAsset( model.body, download ) );

        Promise.all( uploads )
          .then( ( results ) => {
            let hasError = null;
            let result = {};
            results.forEach( ( data ) => {
              if ( !hasError ) {
                if ( data instanceof Error ) hasError = data;
                else if ( data ) result = { ...result, ...data };
              }
            } );
            if ( !hasError ) {
              updateAsset( model, asset, result, download.props.md5 );
              resolve( result );
            } else {
              resolve( hasError );
            }
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
    .then( ( results ) => {
      let hasError = null;
      results.forEach( ( result ) => {
        if ( !hasError && result instanceof Error ) hasError = result;
      } );
      if ( !hasError ) {
        const s3FilesToDelete = model.getFilesToRemove();
        if ( s3FilesToDelete.length ) deleteAssets( s3FilesToDelete, req );
        console.log( 'TRANSFER CTRL NEXT', req.requestId );
        next();
      } else {
        console.log( `TRANSFER CTRL error [${model.getTitle()}]`, hasError );
        next( hasError );
      }
    } )
    .catch( ( err ) => {
      console.log( `TRANSFER CTRL all error [${model.getTitle()}]`, err );
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

  deleteAssets( urlsToRemove, req );
  next();
};
