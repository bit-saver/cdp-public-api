import { Router } from 'express';
import jwt from 'jsonwebtoken';
import vimeoRoutes from './vimeo';

const router = new Router();

/**
 * Blocks access to a route using a JWT token
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export const requireAuth = ( req, res, next ) => {
  console.log( 'requireAuth controller called' );
  if ( req.headers && typeof req.headers.authorization !== 'undefined' ) {
    const token = req.headers.authorization.split( ' ' )[1];
    jwt.verify( token, process.env.JWT_SECRET_KEY, ( err, decoded ) => {
      if ( err || decoded.user !== process.env.JWT_SUBJECT ) {
        return next( { error: 1, message: 'Invalid user credentials' } );
      }
      console.log( 'authorization successful' );
    } );
    if ( !req.headers.vimeo_token ) {
      console.log( 'setting vimeo token on header', process.env.VIMEO_TOKEN );
      req.headers.vimeo_token = process.env.VIMEO_TOKEN || null;
    } else {
      console.log( 'vimeo token was present on header', req.headers.vimeo_token );
    }
    return next();
  }

  next( { error: 1, message: 'Unauthorized' } );
};

/**
 * Generates a JWT using the Subject set in the env vars
 */
const registerCtrl = ( req, res, next ) => {
  if ( !req.body.user ) {
    return res.status( 422 ).send( { error: 'You must provide a username' } );
  }

  jwt.sign( { user: req.body.user }, process.env.JWT_SECRET_KEY, ( err, token ) => {
    res.json( { token } );
  } );
};

if ( /^true/.test( process.env.ALLOW_AUTH_REGISTER || 'false' ) ) {
  router.route( '/register' ).post( registerCtrl );
}

router.use( '/vimeo', vimeoRoutes );

export default router;
