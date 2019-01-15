import express from 'express';
import middlewareSetup from './middleware';
import routes from './api';
import * as sqs from './services/amazon-sqs';
import { handleDownload, handleUpload } from './services/transfers';

// Declare an app from express
const app = express();

// setup the app middlware
middlewareSetup( app );

// set up routes
app.use( '/v1', routes );

// catch all
// Probably need to add a "route not found" error or something like
// that to let clients know when a process failed, i.e. DELETE /v1/video
app.all( '*', ( req, res ) => {
  if ( !res.headersSent ) res.json( { ok: true } );
} );

const queues = async () => {
  try {
    await sqs.createQueue( 'DownloadQueue' );
    const downloadConsumer = sqs.createConsumer( 'DownloadQueue', handleDownload );
    await sqs.createQueue( 'UploadQueue' );
    const uploadConsumer = sqs.createConsumer( 'UploadQueue', handleUpload );
    downloadConsumer.start();
    uploadConsumer.start();
  } catch ( e ) {
    console.error( e );
  }
};

queues();

export default app;
