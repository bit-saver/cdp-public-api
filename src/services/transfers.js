import * as sqs from './amazon-sqs';
import {
  Parcel,
  isTypeAllowed,
  downloadAsset,
  uploadAsset,
  uploadVimeo,
  updateAsset,
  getVideoProperties
} from '../api/modules/utils/transfers';

const tracker = {};

const findByBody = body => Object.values( tracker ).find( parcel =>
  parcel.req.body.site === body.site && parcel.req.body.post_id === body.post_id );

const findByReq = requestId => tracker[requestId];

const processComplete = ( parcel ) => {
  if ( !parcel.upQueue && !parcel.downQueue ) {
    console.log( '\r\nNO UPS AND NO DOWNS SO COMPLETED\r\n' );
    delete tracker[parcel.requestId];
    parcel.next();
  } else {
    console.log( 'ups', parcel.upQueue, 'downs', parcel.downQueue );
  }
};

/**
 *
 * @param parcel Parcel
 * @param asset object
 * @returns {Promise<void>}
 */
const transferAsset = async ( parcel, asset ) => {
  console.log( 'Sending asset to download queue: ', asset.downloadUrl );
  parcel.pushDown();
  await sqs.sendMessage( 'DownloadQueue', {
    requestId: parcel.requestId,
    asset
  } );
};

export const handleDownload = async ( msg, done ) => {
  console.log( 'Received DownloadQueue message: \r\n', msg );
  const body = JSON.parse( msg.Body );
  const asset = body.asset; // eslint-disable-line prefer-destructuring
  const requestId = body.requestId; // eslint-disable-line prefer-destructuring
  const parcel = findByReq( requestId );
  if ( !parcel ) {
    console.error( 'Parcel not found: ', body.requestId, '\r\nAsset: ', body.asset );
    return done();
  }
  const cleanUp = () => {
    parcel.popDown();
    done();
    processComplete( parcel );
  };
  const handleError = ( err ) => {
    delete tracker[requestId];
    parcel.next( err );
    done();
  };
  const model = parcel.getModel();
  let download = null;
  let updateNeeded = false;
  console.info( 'downloading', asset.downloadUrl );

  const allowed = await isTypeAllowed( asset.downloadUrl );
  if ( allowed && asset.md5 ) {
    // Since we have an md5 in the request, check to see if is already present
    // in the ES model assets and if so, no update needed.
    updateNeeded = model.updateIfNeeded( asset, asset.md5 );
    if ( !updateNeeded ) {
      console.log( 'Update not required (md5 pre match).' );
      return cleanUp();
    }
  }
  if ( allowed ) {
    // eslint-disable-next-line max-len
    download = await downloadAsset( asset.downloadUrl, model.getRequestId() ).catch( ( err ) => {
      handleError( err );
    } );
    if ( download instanceof Error ) return handleError( download );
    model.putAsset( { ...asset, md5: download.props.md5 } );
  } else return handleError( new Error( `Content type not allowed for asset: ${asset.downloadUrl}` ) );

  // Attempt to find matching asset in ES document
  if ( !updateNeeded ) updateNeeded = model.updateIfNeeded( asset, download.props.md5 );
  if ( !updateNeeded ) {
    console.log( 'Matched md5, update not required: ', download.props.md5 );
    return cleanUp( { message: 'Update not required.' } );
  }
  console.log( 'Update required for download hash: ', download.props.md5 );
  console.log( 'Sending to UploadQueue' );
  parcel.pushUp();
  await sqs.sendMessage( 'UploadQueue', {
    requestId: parcel.requestId,
    asset,
    download
  } );
  cleanUp();
};

export const handleUpload = async ( msg, done ) => {
  const body = JSON.parse( msg.Body );
  console.log( 'Received UploadQueue message: \r\n', body );
  const asset = body.asset; // eslint-disable-line prefer-destructuring
  const requestId = body.requestId; // eslint-disable-line prefer-destructuring
  const download = body.download; // eslint-disable-line prefer-destructuring
  const parcel = findByReq( requestId );
  if ( !parcel ) {
    console.error( 'Parcel not found: ', body.requestId, '\r\nAsset: ', body.asset );
    return done();
  }
  const cleanUp = () => {
    parcel.popUp();
    done();
    processComplete( parcel );
  };
  const handleError = ( err ) => {
    delete tracker[requestId];
    parcel.next( err );
    done();
  };

  const req = parcel.getReq();
  const model = parcel.getModel();

  const uploads = [];
  uploads.push( uploadAsset( model.body, download ) );
  if ( download.props.contentType.startsWith( 'video' ) ) {
    // Check for Vimeo token to use for Vimeo upload
    if ( req.headers.vimeo_token ) {
      const unit = model.getUnit( asset.unitIndex );
      const props = {
        name: unit.title || null,
        description: unit.desc || null
      };
      uploads.push( uploadVimeo( download, req.headers.vimeo_token, props ) );
    }
    // Check size for Cloudflare upload
    const size = await getVideoProperties( download ).catch( ( err ) => {
      uploads.push( Promise.resolve( err ) );
    } );
    if ( size ) uploads.push( Promise.resolve( size ) );
  }

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
        console.log( 'Upload queue result', result );
        cleanUp();
      } else {
        handleError( hasError );
      }
    } )
    .catch( ( err ) => {
      handleError( err );
    } );
};

export const transferCtrl = Model => async ( req, res, next ) => {
  console.log( 'TRANSFER CONTROLLER INIT', req.requestId );

  const model = new Model();

  try {
    // verify that we are operating on a single, unique document
    const reqAssets = await model.prepareDocumentForUpdate( req );
    // Check for collision with previous request
    const collision = findByBody( req.body );
    if ( collision ) {
      // TODO: Handle collision
      return next( new Error( 'Collision with request already in process.' ) );
    }
    const parcel = new Parcel( {
      model, req, res, next, downQueue: 0, upQueue: 0
    } );
    tracker[model.getRequestId()] = parcel;
    reqAssets.forEach( ( asset ) => {
      if ( asset.downloadUrl ) transferAsset( parcel, asset );
    } );
  } catch ( err ) {
    delete tracker[req.requestId];
    // need 'return' in front of next as next will NOT stop current execution
    return next( err );
  }
};
