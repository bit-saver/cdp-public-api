import { Router } from 'express';
import fs from 'fs';
import vimeo from '../../services/vimeo';
import tempFiles from '../../services/tempfiles';

const router = new Router();

// eslint-disable-next-line no-unused-vars
router.get( '/', ( req, res ) => {
  const url = vimeo.getAuthUrl( req.query.callback );
  // res.json( url );
  res.redirect( url );
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

export default router;
