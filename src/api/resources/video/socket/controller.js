import controllers from '../../../modules/elastic/controller';
import * as utils from '../../../modules/utils/index';

// esDoc, body
export const indexDocument = model => ( req, callback ) => controllers.indexDocument( model, req )
  .then( ( doc ) => {
    req.esDoc = doc;
    callback();
  } )
  .catch( error => callback( error ) );

// body, esDoc, params.id
export const updateDocumentById = model => ( req, callback ) => {
  controllers.updateDocumentById( model, req )
    .then( ( doc ) => {
      if ( req.esDoc ) req.esDoc = { ...req.esDoc, ...doc };
      else req.esDoc = doc;
      callback();
    } )
    .catch( error => callback( error ) );
};

// esDoc, body
export const deleteDocumentById = model => ( req, callback ) => controllers
  .deleteDocumentById( model, req )
  .then( doc => callback( doc ) )
  .catch( error => callback( error ) );

export const getDocumentById = () => ( req, callback ) => {
  if ( req.esDoc ) return callback( req.esDoc );
  callback( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
};

export const setRequestDoc = model => ( req, callback ) => {
  if ( !req.params.uuid ) return callback();
  console.log( 'setRequestDoc running' );
  const query = utils.getQueryFromUuid( req.params.uuid );
  req.queryArgs = query;
  return controllers.findDocument( model, query )
    .then( ( doc ) => {
      if ( doc ) req.esDoc = doc;
      else console.log( 'Set request doc failed' );
      callback();
    } )
    .catch( error => callback( error ) );
};

export const setRequestDocWithRetry = model => async ( req, callback ) => {
  const query = utils.getQueryFromUuid( req.params.uuid );
  req.queryArgs = query;
  let attempts = 0;
  const findDoc = () => {
    attempts += 1;
    console.log( `attempting to find document ${req.params.uuid} attempt: `, attempts );
    controllers
      .findDocument( model, utils.getQueryFromUuid( req.params.uuid ) )
      .then( ( doc ) => {
        if ( doc ) {
          console.log( `Found document for ${req.params.uuid}, passing along...` );
          req.esDoc = doc;
          callback();
        }
        if ( attempts < 6 ) {
          console.log( 'No document found, attempting retry for ', req.params.uuid );
          setTimeout( findDoc, 10000 );
        } else return callback( new Error( `Document not found with UUID: ${req.params.uuid}` ) );
      } )
      .catch( error => callback( error ) );
  };
  await findDoc();
};

export const generateControllers = ( model, overrides = {} ) => {
  const defaults = {
    indexDocument: indexDocument( model ),
    updateDocumentById: updateDocumentById( model ),
    deleteDocumentById: deleteDocumentById( model ),
    getDocumentById: getDocumentById( model ),
    setRequestDoc: setRequestDoc( model )
  };

  return { ...defaults, ...overrides };
};
