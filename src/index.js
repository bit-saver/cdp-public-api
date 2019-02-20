import {} from 'dotenv/config';
import apm from 'elastic-apm-node/start';

require( 'newrelic' );

import http from 'http';
import app from './server';
import socketio from 'socket.io';

// Used for module hot reloading, will maintain state
const server = http.createServer( app );
let currentApp = app;
const PORT = process.env.PORT || 8080;
const io = socketio( server );

server.listen( PORT, () => {
  console.log( `CDP service listening on port: ${PORT}` );
} );

io.on( 'connection', ( socket ) => {
  console.log( 'Client connected' );
  socket.on( 'video', ( data ) => {
    console.log( data );
  } );
} );

if ( module.hot ) {
  module.hot.accept( ['./server'], () => {
    server.removeListener( 'request', currentApp );
    server.on( 'request', app );
    currentApp = app;
  } );
}
