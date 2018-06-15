import { Vimeo } from 'vimeo';
import fs from 'fs';

const vimeoCreds = {
  client_id: process.env.VIMEO_CLIENT_ID || '',
  client_secret: process.env.VIMEO_CLIENT_SECRET || '',
  callback: process.env.VIMEO_CALLBACK || ''
};

const getAuthUrl = ( state = '' ) => {
  const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
  const scopes = 'public private upload delete';
  const url = client.buildAuthorizationEndpoint( vimeoCreds.callback, scopes, state );
  return url;
};

const getTokenFromCode = code =>
  new Promise( ( resolve, reject ) => {
    const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
    // `redirect_uri` must be provided, and must match your configured URI.
    client.accessToken( code, vimeoCreds.callback, ( err, response ) => {
      if ( err ) {
        console.error( err );
        return reject( err );
      }

      if ( response.access_token ) {
        const scopeArgs = response.scope.split( ' ' );
        if ( scopeArgs.indexOf( 'upload' ) < 0 ) {
          return reject( new Error( 'Upload permission was not granted, but is required for this app.' ) );
        }
        console.log( JSON.stringify( response, null, 2 ) );
        return resolve( response );
      }
      return reject( new Error( 'Encountered error while retrieving access token from code.' ) );
    } );
  } );

const getVideo = ( videoId, token ) =>
  new Promise( ( resolve, reject ) => {
    const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
    if ( token ) client.setAccessToken( token );
    client.request(
      {
        path: `/videos/${videoId}`
      },
      ( error, body ) => {
        if ( error ) {
          console.error( error );
          reject( new Error( error ) );
        } else {
          resolve( body );
        }
      }
    );
  } );

const upload = ( videoFile, token, props = {} ) =>
  new Promise( ( resolve, reject ) => {
    const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
    client.setAccessToken( token );
    let progress = null;
    const parameters = {
      name: props.name || null,
      description: props.description || null,
      'privacy.download': true
    };
    client.upload(
      videoFile,
      parameters,
      ( uri ) => {
        const videoId = uri.replace( '/videos/', '' );
        const result = {
          url: `https://player.vimeo.com/video/${videoId}`,
          link: `https://vimeo.com${uri}`,
          thumbnail: null,
          uid: videoId,
          site: 'vimeo'
        };
        console.log( 'Vimeo upload complete. Result: ', result );
        resolve( { stream: result } );
      },
      ( bytesUploaded, bytesTotal ) => {
        // eslint-disable-next-line no-mixed-operators
        const percentage = bytesUploaded / bytesTotal * 100;
        if ( progress === null || progress.toFixed( 0 ) !== percentage.toFixed( 0 ) ) {
          progress = percentage;
          console.log(
            `Uploading to Vimeo${parameters.name ? ` [${parameters.name}]` : ''}: `,
            `${percentage.toFixed( 0 )}%`
          );
        }
      },
      ( error ) => {
        console.error( 'Vimeo upload failed', error );
        reject( new Error( error ) );
      }
    );
  } );

const remove = ( videoId, token ) =>
  new Promise( ( resolve, reject ) => {
    const client = new Vimeo( vimeoCreds.client_id, vimeoCreds.client_secret );
    if ( token ) client.setAccessToken( token );
    client.request(
      {
        method: 'DELETE',
        path: `/videos/${videoId}`
      },
      ( error, body ) => {
        if ( error ) {
          console.error( 'Vimeo remove error', error );
          reject( new Error( error ) );
        } else {
          console.log( 'Vimeo removed', videoId );
          resolve( body );
        }
      }
    );
  } );

export default {
  getAuthUrl,
  getTokenFromCode,
  getVideo,
  upload,
  remove
};
