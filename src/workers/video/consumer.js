/**
 * The stuff in the workers directory may go into a separate contianer.
 * Puting within the api codebase for testing purposes
 *
 */

import {} from 'dotenv/config';
import amqp from 'amqplib';
import { createVideo, deleteVideo } from './controller';

// RabbitMQ connection string
const messageQueueConnectionString = process.env.RABBITMQ_ENDPOINT;

// utility function to publish messages to a channel
function publishToChannel( channel, {
  routingKey,
  exchangeName,
  data
} ) {
  return new Promise( ( resolve, reject ) => {
    channel.publish(
      exchangeName,
      routingKey,
      Buffer.from( JSON.stringify( data ), 'utf-8' ), {
        persistent: true
      }, ( err ) => {
        if ( err ) {
          return reject( err );
        }

        resolve();
      }
    );
  } );
}

async function handleCreate( data, resultsChannel ) {
  const { projectId, projectJson, projectStatus } = data;
  const projectData = JSON.parse( projectJson );
  console.dir( projectData );

  // process data
  const result = await createVideo( projectId, projectData );

  console.log( '[x] RECEIVED a publish create request' );

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result',
    data: {
      projectId, projectStatus, result, resultType: 'create'
    }
  } );
  console.log( '[x] PUBLISHED publish create result' );
}

async function handleDelete( data, resultsChannel ) {
  const { projectId, projectJson, projectStatus } = data;
  const projectData = JSON.parse( projectJson );
  console.dir( projectData );

  // process data
  const result = await deleteVideo( projectId );

  console.log( '[x] RECEIVED a publish delete request' );

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result',
    data: {
      projectId, projectStatus, result, resultType: 'delete'
    }
  } );
  console.log( '[x] PUBLISHED publish delete result' );
}

// consume messages from RabbitMQ
function consume( { connection, channel, resultsChannel } ) {
  return new Promise( ( resolve, reject ) => {
    channel.consume( 'publish.create', async ( msg ) => {
      // parse message
      const msgBody = msg.content.toString();
      try {
        const data = JSON.parse( msgBody );
        await handleCreate( data, resultsChannel );
      } catch ( error ) {
        console.error( error );
      }

      // acknowledge message as processed successfully
      await channel.ack( msg );
    } );

    channel.consume( 'publish.delete', async ( msg ) => {
      // parse message
      const msgBody = msg.content.toString();
      try {
        const data = JSON.parse( msgBody );
        await handleDelete( data, resultsChannel );
      } catch ( error ) {
        console.error( error );
      }

      // acknowledge message as processed successfully
      await channel.ack( msg );
    } );

    // handle connection closed
    connection.on( 'close', err => reject( err ) );

    // handle errors
    connection.on( 'error', err => reject( err ) );
  } );
}


async function listenForMessages() {
  // connect to Rabbit MQ
  const connection = await amqp.connect( messageQueueConnectionString );

  // create a channel and prefetch 1 message at a time
  const channel = await connection.createChannel();
  await channel.prefetch( 1 );

  // create a second channel to send back the results
  const resultsChannel = await connection.createConfirmChannel();

  console.log( '[x] LISTENING for publish create request' );

  // start consuming messages
  await consume( { connection, channel, resultsChannel } );
}


listenForMessages().then();
