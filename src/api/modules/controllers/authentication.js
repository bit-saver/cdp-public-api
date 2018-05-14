import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = new Router();

/**
 * Blocks access to a route using a JWT token
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export const requireAuth = ( req, res, next ) => {
  if ( req.headers && typeof req.headers.authorization !== 'undefined' ) {
    const bearer = req.headers.authorization.split( ' ' );
    const token = bearer[1];
    jwt.verify( token, process.env.JWT_SECRET_KEY, ( err, decoded ) => {
      if ( err ) next( err );
      if ( decoded.user !== process.env.JWT_SUBJECT ) {
        res.status( 403 ).json( 'Invalid user credentials' );
      }
    } );
    return next();
  }
  res.status( 403 ).json( 'Unauthorized' );
};

/**
 * Generates a JWT
 * @param {string} subject
 * @returns {string}
 */
router.route( '/register' ).post( ( req, res, next ) => {
  if ( !req.body.user ) {
    return res.status( 422 ).send( { error: 'You must provide a username' } );
  }

  jwt.sign( { user: req.body.user }, process.env.JWT_SECRET_KEY, ( err, token ) => {
    res.json( { token } );
  } );
} );

export default router;
