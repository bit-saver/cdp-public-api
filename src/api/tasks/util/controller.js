
// this will be moved to the admin node server when v2 is released
const DetectLanguage = require( 'detectlanguage' );

const detectLanguage = new DetectLanguage( {
  key: process.env.LANGUAGE_DETECTION_API_KEY
} );

export default {
  detect: ( req, res, next ) => {
    detectLanguage.detect( req.body.text, ( err, result ) => {
      if ( err ) {
        return next( err );
      }
      return res.json( result );
    } );
  }
};

