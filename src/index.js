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
  await sqs.deleteQueue( 'UploadQueue' );


  const uploadQueue = await sqs.createQueue( 'UploadQueue' );
  console.log( 'uploadQueue result', uploadQueue );

  const consumer = sqs.createConsumer( 'UploadQueue' );
  consumer.start();
};

// const queueresult = queues();

if ( module.hot ) {
  module.hot.accept( ['./server'], () => {
    server.removeListener( 'request', currentApp );
    server.on( 'request', app );
    currentApp = app;
  } );
}
