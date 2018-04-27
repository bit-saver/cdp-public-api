import tempFiles from '../services/tempfiles';

const cleanTempFilesCtrl = ( err, req, res, next ) => {
  if ( !req.indexed ) console.warn( 'REQUEST IS NOT INDEXED' );
  console.log( `---deleteTempFiles--- ${req.requestId}` );
  tempFiles.deleteTempFiles( req.requestId );
  if ( err ) return next( err );
  next();
};

export default cleanTempFilesCtrl;
