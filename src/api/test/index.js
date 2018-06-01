import { Router } from 'express';
import vimeo from '../../services/vimeo';
import tempFiles from '../../services/tempfiles';

const router = new Router();

router.get( '/', async ( req, res ) => {
  const url = vimeo.getAuthUrl( req.query.callback );
  res.redirect( url );
} );

router.get( '/getVideo', async ( req, res ) => {
  res.json( await vimeo.getVideo( req.query.videoId, req.headers.access_token ) );
} );

router.get( '/callback', async ( req, res ) => {
  const tokens = await vimeo.getTokenFromCode( req.query.code ).catch( err => err );
  if ( tokens instanceof Error ) {
    res.json( tokens );
    return;
  }
  console.log( 'tokens', tokens );
  if ( req.query.state ) {
    const json = JSON.stringify( tokens );
    const hash = Buffer.from( json ).toString( 'base64' );
    let redirect = req.query.state;
    if ( redirect.indexOf( '?' ) !== -1 ) {
      redirect += `&token=${hash}`;
    } else redirect += `?token=${hash}`;
    console.log( JSON.stringify( { tokens, hash } ) );
    res.redirect( redirect );
  } else res.json( tokens );
} );

// eslint-disable-next-line no-unused-vars
router.post( '/', async ( req, res, next ) => {
  if ( !req.files || !req.files.length < 1 || !req.files.video ) {
    return res.json( { error: 1, message: 'No video file provided.' } );
  }
  if ( !req.headers.token ) {
    return res.json( { error: 1, message: 'No token provided.' } );
  }
  const token = req.headers.token; // eslint-disable-line prefer-destructuring
  console.log( token );
  const tempFile = tempFiles.createTempFile( req.requestId );
  req.files.video.mv( tempFile.name, async ( err ) => {
    if ( err ) return next( err );
    const result = await vimeo.uploadVideo( tempFile.name, token );
    if ( !res.headersSent ) res.json( result );
    next();
  } );
} );

export default router;
