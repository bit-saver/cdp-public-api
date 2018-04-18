import * as mappings from './mappings';
import client from '../../services/elasticsearch';

const MAPPINGS = {
  videos: mappings.getVideoMapping()
};

const getDateStamp = () => {
  const now = new Date();
  const _month = now.getMonth();
  const month = _month < 10 ? `0${_month}` : _month;
  return `${now.getFullYear()}${month}${now.getDate()}`;
};

// TODO: check to see if it exists before creating
const _create = ( index, mapping = {} ) =>
  client.indices.create( { index, body: { mappings: mapping } } );

const _reindex = ( oldIndex, newIndex ) =>
  client.reindex( {
    body: {
      source: {
        index: oldIndex
      },
      dest: {
        index: newIndex
      }
    }
  } );

const updateAlias = ( oldIndex, newIndex, alias ) =>
  client.indices.updateAliases( {
    body: {
      actions: [{ remove: { index: oldIndex, alias } }, { add: { index: newIndex, alias } }]
    }
  } );

export const exists = ( req, res, next ) =>
  client.indices
    .exists( { index: req.body.index } )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );

export const create = ( req, res, next ) => {
  _create( req.body.index, req.body.mapping )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );
};

export const remove = ( req, res, next ) =>
  client.indices
    .delete( { index: req.body.index } )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );

export const putMapping = ( req, res, next ) =>
  client.indices
    .putMapping( { index: req.body.index, type: req.body.type, body: req.body.body } )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );

export const getMapping = ( req, res, next ) =>
  client.indices
    .getMapping( { index: req.body.index, type: req.body.type } )
    .then( doc => res.status( 200 ).json( doc ) )
    .catch( err => next( err ) );

export const alias = ( req, res, next ) => {};

/*
    To reindex:
    1. Update mapping for applicable content type
    2. Create a new index, index_[datestamp], using the updated mapping if applicable
    3. Execute reindex into new index
    4. Ensure that both indices are synced during reindex process
    5. Point alias to new index
    6. Delete old index
  */

/* NOTES
  check if index already exists
  what about incoming conflicts with data types
  */
export const reindex = async ( req, res, next ) => {
  const indexAlias = req.body.index;
  const newIndex = `${indexAlias}_${getDateStamp()}`;
  const aliasToOldIndex = await client.indices.getAlias( { index: indexAlias } );
  const oldIndex = Object.keys( aliasToOldIndex )[0];
  const createIndexResult = await _create( newIndex, MAPPINGS[indexAlias] );
  const reIndexResult = await _reindex( oldIndex, newIndex );
  const aliasResult = updateAlias( oldIndex, newIndex, indexAlias );

  res.status( 200 ).json( aliasResult );

  // .then( doc => res.status( 200 ).json( doc ) )
  // .catch( err => next( err ) );
  // res.status( 200 );
  // res.status( 200 ).json( newIndexName );
  // res.status( 200 ).json( req.body.mappings );
  // _reindex( req, res, next );
};

/*
PUT test
{
    "settings" : {
        "number_of_shards" : 1
    },
    "mappings" : {
        "type1" : {
            "properties" : {
                "field1" : { "type" : "text" }
            }
        }
    }
}

POST _reindex
{
  "source": {
    "index": "twitter"
  },
  "dest": {
    "index": "new_twitter"
  }
}
POST /_aliases
{
    "actions" : [
        { "remove" : { "index" : "videos_20180317", "alias" : "videos" } },
        { "add" : { "index" : "videos_20180318", "alias" : "videos" } }
    ]
}

*/
