/**
 * The stuff in the workers directory may go into a separate contianer.
 * Puting within the api codebase for testing purposes
 *
 */

import {} from 'dotenv/config';
import amqp from 'amqplib';
import { createDocument, updateDocument, deleteDocument } from './controller';
import { copyS3AllAssets, deleteAllS3Assets } from '../../services/aws/s3';

// RabbitMQ connection string
const RABBITMQ_CONNECTION = process.env.RABBITMQ_ENDPOINT;
const PUBLISHER_BUCKET = process.env.AWS_S3_PUBLISHER_BUCKET;
const PRODUCTION_BUCKET = process.env.AWS_S3_PRODUCTION_BUCKET;

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
  console.log( '[√] Handle a publish create request' );

  let projectId;
  let projectJson;
  let projectDirectory;
  let creation;

  try {
    ( { projectId, projectJson, projectDirectory } = data );
    const projectData = JSON.parse( projectJson );

    // create ES document
    creation = await createDocument( projectId, projectData );

    // if doc is created, copy assets if valid projectDirectory exists
    if ( creation.result === 'created' ) {
      if ( typeof projectDirectory === 'string' && projectDirectory ) {
        // what if this fails? add remove doc?
        copyS3AllAssets( projectDirectory, PUBLISHER_BUCKET, PRODUCTION_BUCKET );
      }
    }
  } catch ( err ) {
    throw new Error( err );
  }

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.create.video',
    data: {
      projectId
    }
  } );

  console.log( '[x] PUBLISHED publish create result' );
}

async function handleUpdate( data, resultsChannel ) {
  console.log( '[√] Handle a publish update request' );

  let projectId;
  let projectJson;
  let projectDirectory;
  let update;

  try {
    ( { projectId, projectJson, projectDirectory } = data );
    const projectData = JSON.parse( projectJson );

    // update ES document
    update = await updateDocument( projectId, projectData );
    if ( update.result === 'updated' ) {
      if ( typeof projectDirectory === 'string' && projectDirectory ) {
        // what if this to update? add remove doc?
        copyS3AllAssets( projectDirectory, PUBLISHER_BUCKET, PRODUCTION_BUCKET );
      }
    }
  } catch ( err ) {
    throw new Error( err );
  }

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.update.video',
    data: {
      projectId
    }
  } );

  console.log( '[x] PUBLISHED publish update result' );
}

async function handleDelete( data, resultsChannel ) {
  console.log( '[√] Handle a publish delete request' );

  let projectId;
  let projectDirectory;
  let deletion;

  try {
    ( { projectId, projectDirectory } = data );

    // delete ES document
    deletion = await deleteDocument( projectId );

    // if doc is deleted, delete assets if valid projectDirectory exists
    if ( deletion.result === 'deleted' ) {
      if ( typeof projectDirectory === 'string' && projectDirectory ) {
        // what if this fails? add doc back?
        deleteAllS3Assets( projectDirectory, PRODUCTION_BUCKET );
      }
    }
  } catch ( err ) {
    throw new Error( err );
  }

  // publish results to channel
  await publishToChannel( resultsChannel, {
    exchangeName: 'publish',
    routingKey: 'result.delete.video',
    data: {
      projectId
    }
  } );

  console.log( '[x] PUBLISHED publish delete result' );
}

async function processRequest( channel, resultsChannel, msg, processFunc ) {
  try {
    // parse message
    const msgBody = msg.content.toString();
    const data = JSON.parse( msgBody );
    await processFunc( data, resultsChannel );

    // acknowledge message as processed successfully
    channel.ack( msg );
  } catch ( error ) {
    // acknowledge error occurred, send to dead letter queue -- should we log to file?
    console.log( `Error, send to dlq ${error.toString()}` );
    channel.reject( msg, false );
  }
}

// consume messages from RabbitMQ
function consume( { connection, channel, resultsChannel } ) {
  return new Promise( ( resolve, reject ) => {
    channel.consume( 'publish.create', async ( msg ) => {
      processRequest( channel, resultsChannel, msg, handleCreate );
    } );

    channel.consume( 'publish.update', async ( msg ) => {
      processRequest( channel, resultsChannel, msg, handleUpdate );
    } );

    channel.consume( 'publish.delete', async ( msg ) => {
      processRequest( channel, resultsChannel, msg, handleDelete );
    } );

    // handle connection closed
    connection.on( 'close', err => reject( err ) );

    // handle errors
    connection.on( 'error', err => reject( err ) );
  } );
}


async function listenForMessages() {
  // connect to Rabbit MQ
  const connection = await amqp.connect( RABBITMQ_CONNECTION );

  // create a channel and prefetch 1 message at a time
  const channel = await connection.createChannel();
  await channel.prefetch( 1 );

  // create a second channel to send back the results
  const resultsChannel = await connection.createConfirmChannel();

  console.log( '[...] LISTENING for publish requests' );

  // start consuming messages
  await consume( { connection, channel, resultsChannel } );
}


listenForMessages();
