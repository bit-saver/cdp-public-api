import request from 'request';

export const download = ( req, res, next ) => {
  res.setHeader( 'content-disposition', `attachment; filename=${req.body.filename}` );
  request.get( req.body.url ).pipe( res );
};

