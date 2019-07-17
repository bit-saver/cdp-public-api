import client from '../../services/elasticsearch';
import validate, { compileValidationErrors } from './validate';

/**
 * Extract the first hit result from an ES search.
 * If noError is true (default) then an empty esId and body will be returned,
 * otherwise an error is thrown.
 *
 * @param noError
 * @returns object { esId, body }
 */
const parseFindResult = ( noError = true ) => ( result ) => {
  if ( result && result.hits && result.hits.total > 0 ) {
    const [hit] = result.hits.hits;
    return {
      esId: hit._id,
      body: { ...hit._source }
    };
  }
  if ( noError ) {
    return { esId: null, body: null };
  }
  throw new Error( 'Not found.' );
};

/**
 * Retrieve the project from ES if it exists.
 */
const findVideoDoc = projectId => client
  .search( {
    index: 'videos',
    type: 'video',
    q: `site:publisher AND post_id:${projectId}`
  } );

/**
 * Validate the incoming data against expected schema.
 */
const validateSchema = ( data ) => {
  const result = validate( data );
  if ( !result.valid ) {
    throw compileValidationErrors( result.errors );
  }
  return true;
};

/**
 * Index the video in ES.
 */
const indexVideoDoc = async ( body, esId = null ) => {
  if ( esId ) {
    const result = await client.update( {
      index: 'videos',
      type: 'video',
      id: esId,
      body: {
        doc: body
      }
    } );
    if ( result._id ) {
      return {
        esId: result._id,
        error: null
      };
    }
    return {
      esId: null,
      error: 'Document was not updated.'
    };
  }
  const result = await client.index( {
    index: 'videos',
    type: 'video',
    body
  } );
  if ( result._id ) {
    return {
      esId: result._id,
      error: null
    };
  }
  return {
    esId: null,
    error: 'Document was not created.'
  };
};

/**
 * Delete the video specified by id from ES.
 * @param id
 * @returns {Promise<{boolean}>}
 */
const deleteVideoDoc = async id => client.delete( {
  index: 'videos',
  type: 'video',
  id
} ).then( ( { found } ) => found );

/**
 * Create/update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const createVideo = async ( projectId, projectData ) => {
  console.log( 'Index new content', projectId, projectData );
  const ret = {
    projectId,
    esId: null,
    error: null
  };
  try {
    const docFound = await findVideoDoc( projectId ).then( parseFindResult() );
    ret.esId = docFound.esId;
    validateSchema( projectData );
    const result = await indexVideoDoc( { ...docFound.body, ...projectData }, docFound.esId );
    return { ...ret, ...result };
  } catch ( error ) {
    console.error( error );
    ret.error = error.toString();
    return ret;
  }
};

/**
 * Delete a video from ES witht he specified projectId (post_id)
 * @param projectId
 * @returns {Promise<{esId, error, projectId, docFound}>}
 */
export const deleteVideo = async ( projectId ) => {
  console.log( 'Delete content', projectId );
  const ret = {
    projectId,
    esId: null,
    docFound: null,
    error: null
  };
  try {
    const docFound = await findVideoDoc( projectId ).then( parseFindResult() );
    ret.docFound = docFound.body;
    ret.esId = docFound.esId;

    // only delete if there's actually something to delete
    if ( docFound.esId ) {
      await deleteVideoDoc( docFound.esId );
    }
  } catch ( error ) {
    console.error( error );
    ret.error = error.toString();
  }
  return ret;
};
