import AbstractModel from '../../modules/abstractModel';
import Ajv from 'ajv';
import languageSchema from '../../modules/schema/language';
import thumbnailSchema from '../../modules/schema/thumbnail';

/**
 * Video Content Model helps in managing assets within JSON.
 */
class Post extends AbstractModel {
  constructor( index = 'posts', type = 'post' ) {
    super( index, type );

    // compile only once
    this.compileSchema();
  }

  static validateSchema( body ) {
    const valid = Post.validate( body );
    return {
      valid,
      errors: Post.validate.errors
    };
  }

  // eslint-disable-next-line class-methods-use-this
  compileSchema() {
    const schema = {
      title: 'Post',
      type: 'object',
      properties: {
        post_id: { type: 'integer' },
        site: { type: 'string' },
        type: { type: 'string' },
        published: { type: 'string' },
        modified: { type: 'string' },
        owner: { type: 'string' },
        author: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        },
        link: { type: 'string' },
        title: { type: 'string' },
        slug: { type: 'string' },
        content: { type: 'string' },
        excerpt: { type: 'string' },
        thumbnail: thumbnailSchema,
        language: languageSchema,
        languages: {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            properties: {
              post_id: { type: 'integer' },
              language: languageSchema
            }
          }
        },
        tags: {
          type: 'array',
          default: [],
          items: { type: 'string' }
        },
        categories: {
          type: 'array',
          default: [],
          items: { type: 'string' }
        }
      }
    };

    // 'useDefaults' adds a default value during validation if it is listed
    // 'removeAdditional' removes any properties during validation that are not in the schema
    // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
    const ajv = new Ajv( { useDefaults: true, removeAdditional: 'all', coerceTypes: true } );
    Post.validate = ajv.compile( schema );
  }

  /**
   * Returns an array of asssets (just thumbnail for now).
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getAssets( json ) {
    const assets = [];
    if ( json.thumbnail ) {
      [
        'small', 'medium', 'large', 'full'
      ].forEach( ( size ) => {
        if ( json.thumbnail[size] ) {
          assets.push( {
            downloadUrl: json.thumbnail[size].url,
            md5: json.thumbnail[size].md5 || null,
            width: json.thumbnail[size].width,
            height: json.thumbnail[size].height,
            orientation: json.thumbnail[size].orientation,
            unitIndex: size,
            srcIndex: -1,
            assetType: 'thumbnail'
          } );
        }
      } );
    }
    return assets;
  }

  /**
   * Updates an asset's downloadUrl and md5 based on the unitIndex and srcIndex
   * stored in the asset object. This is okay since under all circumstances
   * the asset would have been iterated over using the objects obtained from
   * the getAssets method above.
   *
   * @param asset
   */
  // eslint-disable-next-line class-methods-use-this
  putAsset( asset ) {
    if ( asset.assetType === 'thumbnail' ) {
      const source = this.body.thumbnail[asset.unitIndex];
      source.url = asset.downloadUrl;
      source.width = asset.width;
      source.height = asset.height;
      source.orientation = asset.orientation;
      source.md5 = asset.md5;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getUnits( json ) {
    return [json];
  }
}

export default Post;
