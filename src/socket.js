import socketio from 'socket.io';
import VideoRouter from './api/resources/video/socket/route';

const createSocket = ( server ) => {
  const io = socketio( server );

  io.on( 'connection', ( client ) => {
    console.log( '[Socket] Client connected' );

    client.on( 'VIDEO.PUT', ( data ) => {
      console.log( '[Socket] Received video data\r\n', data );
      VideoRouter.route( 'PUT', client, data );
    } );

    client.on( 'VIDEO.DELETE', ( data ) => {
      console.log( '[Socket] Received video delete request\r\n', data );
      VideoRouter.route( 'DELETE', client, data );
    } );

    client.on( 'message', ( message ) => {
      console.log( '[Socket] Message received\r\n', message );
    } );
  } );

  return io;
};

export default createSocket;
