import tempFiles from '../services/tempfiles';

export const cleanTempFilesErrorCtrl = ( err, req, res, next ) => {
  console.log( 'cleanTempFilesCtrl' );
  if ( !req.indexed ) console.warn( 'REQUEST IS NOT INDEXED' );
  tempFiles.deleteTempFiles( req.requestId );
  if ( err ) return next( err );
  next();
};

export const cleanTempFilesCtrl = ( req, res, next ) => {
  console.log( 'cleanTempFilesCtrl' );
  if ( !req.indexed ) console.warn( 'REQUEST IS NOT INDEXED' );
  tempFiles.deleteTempFiles( req.requestId );
  next();
};
