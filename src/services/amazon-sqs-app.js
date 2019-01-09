import Consumer from 'sqs-consumer';

const app = Consumer.create( {
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/721115127313/TylerQueue',
  handleMessage: ( message, done ) => {
    // do some work with `message`
    console.log( 'Handling dis message, yo: \r\n', message );
    const body = JSON.parse( message.Body );
    console.log( 'Got dis body, yo: ', body );
    done();
  }
} );

app.on( 'error', ( err ) => {
  console.log( err.message );
} );

export const start = () => {
  console.log( 'consumer listening' );
  app.start();
};
