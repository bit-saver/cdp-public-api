import { Vimeo } from 'vimeo';
import fs from 'fs';

const vimeoCreds = JSON.parse( fs.readFileSync( `${process.cwd()}/vimeo.json` ) );
const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );

const getAuthUrl = ( state = '' ) => {
  const scopes = 'public private upload';
  const url = client.buildAuthorizationEndpoint( vimeoCreds.redirect_uri, scopes, state );
  return url;
};

const getTokenFromCode = code =>
  new Promise( ( resolve, reject ) => {
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

const uploadVideo = ( videoFile, token ) =>
  new Promise( ( resolve, reject ) => {
    client.setAccessToken( token );
    const parameters = {
      name: 'Test Video',
      description: 'Test Video Description',
      'privacy.download': true
    };
    client.upload(
      videoFile,
      parameters,
      ( uri ) => {
        console.log( 'File upload completed. Your Vimeo URI is:', uri );
        const videoId = uri.replace( '/videos/', '' );
        resolve( { uri, videoId } );
      },
      ( bytesUploaded, bytesTotal ) => {
        // eslint-disable-next-line no-mixed-operators
        const percentage = ( bytesUploaded / bytesTotal * 100 ).toFixed( 2 );
        console.log( bytesUploaded, bytesTotal, `${percentage}%` );
      },
      ( error ) => {
        console.error( `Failed because: ${error}`, error );
        reject( new Error( error ) );
      }
    );
  } );

const getVideo = ( videoId, token ) =>
  new Promise( ( resolve, reject ) => {
    if ( token ) client.setAccessToken( token );
    client.request(
      {
        path: `/videos/${videoId}`
      },
      ( error, body, status ) => {
        if ( error ) {
          console.log( 'error', error );
          reject( new Error( error ) );
        } else {
          console.log( 'body', body );
          resolve( body );
        }

        console.log( 'status code', status );
      }
    );
  } );

export default {
  getAuthUrl,
  getTokenFromCode,
  uploadVideo,
  getVideo
};
