import AWS from 'aws-sdk';
import Consumer from 'sqs-consumer';

AWS.config.update( {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
} );

const URL = 'https://sqs.us-east-1.amazonaws.com/721115127313/';

const sqs = new AWS.SQS( { apiVersion: '2012-11-05' } );

export const createQueue = async ( queueName ) => {
  const result = await sqs.createQueue( { QueueName: queueName } ).promise();

  return result;
};

export const deleteQueue = async ( queueName ) => {
  const result = await sqs.deleteQueue( { QueueUrl: `${URL}${queueName}` } ).promise();

  return result;
};

export const sendMessage = async ( params ) => {
  const result = await sqs.sendMessage( params ).promise();

  return result;
};

export const createConsumer = ( queueName, handler ) => {
  const app = Consumer.create( {
    queueUrl: `${URL}${queueName}`,
    handleMessage: handler || ( ( message, done ) => {
      // do some work with `message`
      console.log( 'Handling dis message, yo: \r\n', message );
      const body = JSON.parse( message.Body );
      console.log( 'Got dis body, yo: ', body );
      done();
    } )
  } );

  app.on( 'error', ( err ) => {
    console.log( err.message );
  } );

  return app;
};
