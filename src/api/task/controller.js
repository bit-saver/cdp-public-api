import Request from 'request';
import Mime from 'mime-types';

export const download = ( req, res ) => {
  let filename;
  let url;
  if ( req.body.url && req.body.filename ) ( { filename, url } = req.body );
  else {
    const opts = JSON.parse( Buffer.from( req.params.opts, 'base64' ).toString() );
    ( { filename, url } = opts );
  }
  const mimeType = Mime.lookup( url ) || 'application/octet-stream';
  const reqHead = Request.head( { url }, ( error, response ) => {
    if ( error ) {
      reqHead.abort();
      return res.status( 404 ).json( error );
    }
    if ( response.statusCode !== '200' ) {
      reqHead.abort();
      return res.status( 404 ).send( 'File not found.' );
    }
    const fileSize = response.headers['content-length'];
    // Chunks based streaming
    if ( req.headers.range ) {
      const { range } = req.headers;
      const parts = range.replace( /bytes=/, '' ).split( '-' );
      const start = parseInt( parts[0], 10 );
      const end = parts[1] ? parseInt( parts[1], 10 ) : fileSize - 1;
      const chunksize = end - start + 1; // eslint-disable-line no-mixed-operators

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType
      };
      res.writeHead( 206, head );
      Request.get( url, {
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          connection: 'keep-alive',
          range,
          'accept-ranges': 'bytes'
        }
      } ).pipe( res );
    } else {
      if ( fileSize ) res.setHeader( 'Content-Length', fileSize );
      res.setHeader( 'Content-Type', mimeType );
      res.setHeader( 'Content-Disposition', `attachment; filename=${filename}` );
      Request.get( url ).pipe( res );
    }
  } );
};
