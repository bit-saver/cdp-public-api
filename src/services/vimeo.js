import { Vimeo } from 'vimeo';
import fs from 'fs';

const vimeoCreds = JSON.parse( fs.readFileSync( `${process.cwd()}/vimeo.json` ) );

const getAuthUrl = ( state = '' ) => {
  const scopes = 'public private';
  const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
  const url = client.buildAuthorizationEndpoint( vimeoCreds.redirect_uri, scopes, state );
  return url;
};

const getTokenFromCode = code =>
  new Promise( ( resolve, reject ) => {
    const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
    console.log( code );
    // `redirect_uri` must be provided, and must match your configured URI.
    client.accessToken( code, vimeoCreds.redirect_uri, ( err, response ) => {
      if ( err ) {
        console.log( err );
        return reject( err );
      }

      if ( response.access_token ) {
        // At this state the code has been successfully exchanged for an
        // access token
        client.setAccessToken( response.access_token );

        // Other useful information is included alongside the access token,
        // which you can dump out to see, or visit our API documentation.
        //
        // We include the final scopes granted to the token. This is
        // important because the user, or API, might revoke scopes during
        // the authentication process.
        // const scopes = response.scope;

        // We also include the full user response of the newly
        // authenticated user.
        // const user = response.user;
        console.log( JSON.stringify( response, null, 2 ) );
        return resolve( response );
      }
      return reject( new Error( 'Encountered error while retrieving access token from code.' ) );
    } );
  } );

export default {
  getAuthUrl,
  getTokenFromCode
};
