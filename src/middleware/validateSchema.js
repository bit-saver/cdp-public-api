const compileValidationErrors = errors => `Validation errors: ${errors.map( error => `${error.dataPath} : ${error.message}` )}`;

const validate = ( Model, useDefaults, body ) => {
  const result = Model.validateSchema( body, useDefaults );
  if ( !result.valid ) {
    return new Error( compileValidationErrors( result.errors ) );
  }
  if ( !body.thumbnail || !body.thumbnail.sizes ) {
    console.log( 'Missing thumbnail', '\r\n', JSON.stringify( body, null, 2 ) );
  }
  return null;
};

export const validateRequest = ( Model, useDefaults = true ) => async ( req, res, next ) => {
  const result = validate( Model, useDefaults, req.body );
  if ( result !== true ) {
    return next( result );
  }
  next();
};


export const validateSocket = ( Model, useDefaults = true ) => ( req, callback ) => {
  callback( validate( Model, useDefaults, req.body ) );
};
