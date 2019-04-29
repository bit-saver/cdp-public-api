import socketio from 'socket.io';
import VideoRouter from './api/resources/video/socket/route';

let socket = null;

const createSocket = ( server ) => {
  if ( socket ) socket.close();
  socket = socketio( server );
  socket.on( 'connection', ( client ) => {
    console.info( '[Socket] Client connected' );

    client.on( 'index.video', ( data, ack ) => {
      console.info( '[Socket] Received video data with post_id:', data.post_id );
      const requestId = VideoRouter.route( 'index', client, data );
      ack( requestId );
    } );

    client.on( 'delete.video', ( data, ack ) => {
      console.info( '[Socket] Received video delete request\r\n', data );
      const requestId = VideoRouter.route( 'delete', client, data );
      ack( requestId );
    } );

    client.on( 'message', ( message ) => {
      console.log( '[Socket] Message received\r\n', message );
    } );
  } );

  return socket;
};

export default createSocket;
