const tracker = {};

const transferAsset = ( parcel, asset ) => {

};

const findByBody = body => tracker.find( parcel =>
  parcel.body.site === body.site && parcel.body.post_id === body.post_id );

export const transferCtrl = Model => async ( req, res, next ) => {
  console.log( 'TRANSFER CONTROLLER INIT', req.requestId );

  const model = new Model();

  try {
    // verify that we are operating on a single, unique document
    const reqAssets = await model.prepareDocumentForUpdate( req );
    // Check for collision with previous request
    const collision = findByBody( req.body );
    if ( collision ) {
      // TODO: Handle collision
      return next( new Error( 'Collision with request already in process.' ) );
    }
    const parcel = {
      model, req, res, next, upQueue: 0, downQueue: 0
    };
    tracker.push( parcel );
    reqAssets.forEach( ( asset ) => {
      if ( asset.downloadUrl ) transferAsset( parcel, asset );
    } );
  } catch ( err ) {
    // need 'return' in front of next as next will NOT stop current execution
    return next( err );
  }
};
