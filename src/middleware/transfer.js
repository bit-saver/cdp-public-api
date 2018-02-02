import aws from '../services/amazon-aws';
import Download from '../api/modules/download';

/**
 * Generates a "transfer" middleware that serves as an intermediary
 * between an index/update request and the actual ES action.
 * This step downloads the file and uploads it to S3.
 * It takes a controller to pass the request onto if all functions
 * succeed.
 *
 * @param controllers
 * @param Model ContentModel
 */
const generateTransferCtrl = ( controllers, Model ) => async ( req, res, next ) => {
  let document = await controllers.findDocument( req.body ).catch( () => null );
  let esModel = null;
  if ( document && document.length > 0 ) {
    [document] = document;
    esModel = new Model( document );
  }

  let esAssets = [];
  let reqAssets = [];

  // Promise array (holds all download/upload processes)
  const transfers = [];

  const reqModel = new Model( req.body );
  reqAssets = reqModel.getAssets();
  if ( esModel ) {
    esAssets = esModel.getAssets();
    reqModel.id = esModel.id;
  }

  const transferAsset = async ( asset ) => {
    console.info( 'downloading', asset.downloadUrl );
    const download = await Download( asset.downloadUrl ).catch( ( err ) => {
      throw err;
    } );
    reqModel.putAsset( { ...asset, md5: download.props.md5 } );

    return new Promise( ( resolve, reject ) => {
      // Attempt to find matching asset in ES document
      const esAsset = esAssets.find( ass => ass.md5 === download.props.md5 );
      if ( esAsset ) {
        console.log( 'md5 match, update not required' );
        // We do not need to reupload
        // but the request still needs to be updated to match the ES doc
        reqModel.putAsset( {
          ...asset,
          downloadUrl: esAsset.downloadUrl,
          md5: esAsset.md5
        } );
        resolve( { message: 'Update not required.' } );
      } else {
        aws
          .upload( {
            title: `${req.body.site}/video/${req.body.post_id}/${download.props.md5}`,
            ext: download.props.ext,
            tmpObj: download.tmpObj
          } )
          .then( ( result ) => {
            // Modify the original request by:
            // replacing the downloadUrl and adding a checksum
            reqModel.putAsset( {
              ...asset,
              downloadUrl: result.Location,
              md5: download.props.md5
            } );
            resolve( result );
          } )
          .catch( err => reject( err ) );
      }
    } );
  };

  reqAssets.forEach( ( asset ) => {
    transfers.push( transferAsset( asset ) );
  } );

  // Once all promises resolve, pass request onto ES controller
  Promise.all( transfers )
    .then( ( results ) => {
      // reassign reqAssets to account for changes
      reqAssets = reqModel.getAssets();
      // Now clean up S3 by removing any unused assets
      esAssets.forEach( ( ass ) => {
        if ( !reqAssets.find( val => val.md5 === ass.md5 ) ) {
          aws.remove( { url: ass.downloadUrl } );
        }
      } );
      req.body = reqModel.getJson();

      console.log( 'transfer results', results );
      console.log( 'req.body', JSON.stringify( req.body, undefined, 2 ) );
      next();
    } )
    .catch( err => res.status( 500 ).json( err ) );
};

export default generateTransferCtrl;
