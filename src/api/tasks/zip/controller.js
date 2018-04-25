import Download from '../../modules/download';
import Archiver from 'archiver';
import fs from 'fs';
import tempfiles from '../../../services/tempfiles';

/**
 * Downloads files specified in the provided urls array, zips them, and sends back the zip.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
const zip = async ( req, res, next ) => {
  if ( !req.body.urls || req.body.urls.constructor !== Array ) {
    return next( new Error( 'Invalid request. Must have urls property containing array of valid URLs.' ) );
  }
  const promises = [];
  req.body.urls.forEach( ( url ) => {
    promises.push( new Download( url, req.requestId ) );
  } );
  Promise.all( promises )
    .then( ( results ) => {
      console.log( 'download results', JSON.stringify( results, null, 2 ) );
      let hasError = false;
      const archive = Archiver( 'zip' );
      archive.pipe( res );
      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on( 'warning', ( err ) => {
        if ( err.code === 'ENOENT' ) {
          console.warn( 'zip warning', JSON.stringify( err, null, 2 ) );
        } else {
          hasError = true;
          console.error( 'zip error', JSON.stringify( err, null, 2 ) );
          return next( err );
        }
      } );
      // good practice to catch this error explicitly
      archive.on( 'error', ( err ) => {
        hasError = true;
        console.error( JSON.stringify( err, null, 2 ) );
        return next( err );
      } );

      if ( hasError ) return;
      res.header( 'Content-Type', 'application/zip' );
      res.header( 'Content-Disposition', 'attachment; filename=files.zip' );
      results.forEach( ( result ) => {
        archive.append( fs.createReadStream( result.filePath ), { name: result.props.basename } );
      } );
      res.on( 'finish', () => {
        // we have to call this directly since the pipe to response closes the req chain
        tempfiles.deleteTempFiles( req.requestId );
      } );
      archive.finalize();
    } )
    .catch( ( err ) => {
      console.error( 'zip error', JSON.stringify( err, null, 2 ) );
      return next( err );
    } );
};

export default zip;
