import {} from 'dotenv/config';
// import apm from 'elastic-apm-node/start';

// require( 'newrelic' );

import http from 'http';
import app from './server';
import * as sqs from './services/amazon-sqs';

// Used for module hot reloading, will maintain state
const server = http.createServer( app );
let currentApp = app;
const PORT = process.env.PORT || 8080;

server.listen( PORT, () => {
  console.log( `CDP service listening on port: ${PORT}` );
} );

const queues = async () => {
  try {
    await sqs.createQueue( 'DownloadQueue' );
    const downloadConsumer = sqs.createConsumer( 'DownloadQueue' );
    await sqs.createQueue( 'UploadQueue' );
    const uploadConsumer = sqs.createConsumer( 'UploadQueue' );
    downloadConsumer.start();
    uploadConsumer.start();
  } catch ( e ) {
    console.error( e );
    server.abort();
  }
};

queues();

if ( module.hot ) {
  module.hot.accept( ['./server'], () => {
    server.removeListener( 'request', currentApp );
    server.on( 'request', app );
    currentApp = app;
  } );
}
