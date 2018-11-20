import Request from 'request';

export const download = ( req, res ) => {
  let filename;
  let url;
  if ( req.body.url && req.body.filename ) ( { filename, url } = req.body );
  else {
    const opts = JSON.parse( Buffer.from( req.params.opts, 'base64' ).toString() );
    ( { filename, url } = opts );
  }
  res.setHeader( 'Content-Type', 'application/octet-stream' );
  res.setHeader( 'Content-Disposition', `attachment; filename=${filename}` );
  Request.get( url ).pipe( res );
};
