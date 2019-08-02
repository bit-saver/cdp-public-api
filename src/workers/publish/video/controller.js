import client from '../../../services/elasticsearch';
import validate, { compileValidationErrors } from './validate';

/**
 * Extract the first hit result from an ES search
 * Should return only a single unique result
 *
 * @returns string  esId
 */
const parseFindResult = ( result ) => {
  if ( result && result.hits && result.hits.total === 1 ) { // should return only 1 unique result
    const [hit] = result.hits.hits;
    return hit._id;
  }
};

/**
 * Retrieve es project id from ES if it exists.
 */
const findDocumentId = async ( projectId ) => {
  const doc = await client
    .search( {
      index: 'videos',
      type: 'video',
      q: `site:commons.america.gov AND post_id:${projectId}`
    } );

  const id = parseFindResult( doc );
  return id || null;
};

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
 * Index/create a new video doc
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _createDocument = async body => client.index( {
  index: 'videos',
  type: 'video',
  body
} );

/**
 * Update the video specified by id from ES.
 * @param id elasticsearch id
 * @param body updated data
 * @returns {Promise<{boolean}>}
 */
const _updateDocument = async ( body, esId ) => client.update( {
  index: 'videos',
  type: 'video',
  id: esId,
  body: {
    doc: body
  }
} );

/**
 * Delete the video specified by id from ES.
 * @param id
 * @returns {Promise<{boolean}>}
 */
const _deleteDocument = async id => client.delete( {
  index: 'videos',
  type: 'video',
  id
} );


/**
 * Update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const updateDocument = async ( projectId, projectData ) => {
  console.log( 'Update content', projectId, projectData );

  validateSchema( projectData );

  const esId = await findDocumentId( projectId );
  if ( !esId ) {
    throw new Error( 'Unable to find easticsearch document ' );
  }

  return _updateDocument( { ...projectData }, esId );
};

/**
 * Create/update a video for the supplied id (post_id in ES) and data
 * @param projectId
 * @param projectData
 * @returns {Promise<{esId, error, projectId}>}
 */
export const createDocument = async ( projectId, projectData ) => {
  console.log( 'Index new content', projectId, projectData );

  validateSchema( projectData );

  return _createDocument( { ...projectData } );
};

/**
 * Delete a video from ES witht he specified projectId (post_id)
 * @param projectId
 * @returns {Promise<{esId, error, projectId, docFound}>}
 */
export const deleteDocument = async ( projectId ) => {
  console.log( 'Delete content', projectId );

  const esId = await findDocumentId( projectId );
  if ( !esId ) {
    throw new Error( 'Unable to find easticsearch document ' );
  }

  // only delete if there's actually something to delete
  return _deleteDocument( esId );
};
