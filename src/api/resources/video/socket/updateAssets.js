import { exec } from 'child_process';
import * as utils from '../../../modules/utils';
import aws from '../../../../services/amazon-aws';

/**
 * Retreives video size and duration using ffprobe.
 * Works on local file paths and remote URLs.
 *
 * @param url
 * @returns {Promise<any>}
 */
const getVideoProperties = url => new Promise( ( resolve, reject ) => {
  const props = {
    size: {
      width: null,
      height: null,
      filesize: null,
      bitrate: null
    },
    duration: null
  };
  exec( `ffprobe -i "${url}" -hide_banner -show_format -show_streams -v error -print_format json`, ( error, stdout ) => {
    if ( error ) {
      return reject( new Error( 'Video properties could not be obtained' ) );
    }
    const meta = JSON.parse( stdout );
    if ( meta.streams && meta.streams.length > 0 ) {
      for ( let i = 0; i < meta.streams.length; i + 1 ) {
        const stream = meta.streams[i];
        if ( stream.codec_type === 'video' ) {
          props.size.width = stream.width;
          props.size.height = stream.height;
          break;
        }
      }
      if ( meta.format ) {
        props.size.filesize = meta.format.size;
        props.size.bitrate = meta.format.bit_rate;
        props.duration = meta.format.duration;
      }
    }
    return resolve( props );
  } );
} );

const isTypeAllowed = ( contentType ) => {
  if ( !contentType ) return false;
  const allowedTypes = utils.getContentTypes();
  return allowedTypes.includes( contentType );
};

/**
 * Checks for proper asset extension.
 * Adds media info if content type is video.
 *
 * @param model
 * @param asset
 */
const updateAsset = ( model, asset ) => new Promise( async ( resolve ) => {
  // console.log( '[updateAsset]', asset );
  const contentType = await utils.getTypeFromUrl( asset.downloadUrl );
  const allowed = isTypeAllowed( contentType );
  if ( !allowed ) {
    return resolve( new Error( `Content type not allowed for asset: ${asset.downloadUrl}` ) );
  }

  if ( contentType.toLowerCase().startsWith( 'video' ) ) {
    // Check to see if we are missing any video meta data
    let needsMeta = !asset.size || !asset.duration;
    if ( !needsMeta ) {
      needsMeta = Object.values( asset.size )
        .reduce( ( needs, val ) => needs || !val, !asset.duration );
    }
    if ( needsMeta ) {
      const size = await getVideoProperties( asset.downloadUrl ).catch( err => resolve( err ) );
      model.putAsset( {
        ...asset,
        size: size.size || null,
        duration: size.duration || null
      } );
      return resolve();
    }
  }
  model.putAsset( asset );
  resolve();
} );

const deleteAssets = ( assets ) => {
  if ( !assets || assets.length < 1 ) return;
  assets.forEach( ( asset ) => {
    if ( asset.url ) aws.remove( asset );
  } );
};

export const updateVideoCtrl = Model => async ( req, next ) => {
  let reqAssets = [];
  const updates = []; // Promise array

  const model = new Model();

  try {
    // verify that we are operating on a single, unique document
    reqAssets = await model.prepareDocumentForUpdate( req );
  } catch ( err ) {
    // need 'return' in front of next as next will NOT stop current execution
    return next( err );
  }

  reqAssets.forEach( ( asset ) => {
    if ( !asset.downloadUrl ) return;
    updates.push( updateAsset( model, asset ) );
  } );

  // Once all promises resolve, pass request onto ES controller
  await Promise.all( updates )
    .then( ( results ) => {
      let hasError = null;
      results.forEach( ( result ) => {
        if ( !hasError && result instanceof Error ) hasError = result;
      } );
      if ( !hasError ) {
        const s3FilesToDelete = model.getFilesToRemove();
        if ( s3FilesToDelete.length ) deleteAssets( s3FilesToDelete, req );
        next();
      } else {
        console.log( `UPDATE VIDEO CTRL error [${model.getTitle()}]`, hasError );
        next( hasError );
      }
    } )
    .catch( ( err ) => {
      console.log( `UPDATE VIDEO CTRL all error [${model.getTitle()}]`, err );
      next( err );
    } );
};

export const deleteAssetCtrl = Model => async ( req, res, next ) => {
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
