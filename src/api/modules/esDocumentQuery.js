const esQuery = ( client, index, type ) => ( {
  indexDocument( body ) {
    return client.index( { index, type, body } );
  },

  // update method requires doc prop.
  // doc prop contains part of or complete doc to update
  updateDocument( id, doc ) {
    return client.update( {
      id,
      index,
      type,
      body: { doc }
    } );
  },

  getDocument( id ) {
    return client.get( { id, index, type } );
  },

  deleteDocument( id ) {
    return client.delete( { id, index, type } );
  }
} );

export default esQuery;
