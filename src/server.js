import express from 'express';
import middlewareSetup from './middleware';
import routes from './api';

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

export default app;
