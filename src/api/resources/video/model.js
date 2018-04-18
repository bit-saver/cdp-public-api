import AbstractModel from '../../modules/abstractModel';
import Ajv from 'ajv';
import videoSchema from '../../modules/schema/video';

/**
 * Video Content Model helps in managing assets within JSON.
 */
class Video extends AbstractModel {
  constructor( index = 'videos', type = 'video' ) {
    super( index, type );

    // compile only once
    this.compileSchema();
  }

  static validateSchema( body ) {
    const valid = Video.validate( body );
    return {
      valid,
      errors: Video.validate.errors
    };
  }

  // eslint-disable-next-line class-methods-use-this
  compileSchema() {
    // 'useDefaults' adds a default value during validation if it is listed
    // 'removeAdditional' removes any properties during validation that are not in the schema
    // 'coerceTypes' will coerce to appropriate type.  using to coerce string number to number
    const ajv = new Ajv( { useDefaults: true, removeAdditional: 'all', coerceTypes: true } );
    Video.validate = ajv.compile( videoSchema );
  }

  /**
   * Returns an array of asssets retrieved by iterating over the JSON
   * unit > sources.
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getAssets( json ) {
    // this could have urls to process from various nodes in json doc
    const assets = [];
    json.unit.forEach( ( unit, unitIndex ) => {
      unit.source.forEach( ( src, srcIndex ) => {
        assets.push( {
          downloadUrl: src.downloadUrl,
          stream: src.stream || {},
          md5: src.md5 || null,
          size: src.size || null,
          duration: src.duration || null,
          unitIndex,
          srcIndex,
          assetType: 'source'
        } );
      } );
      if ( unit.transcript ) {
        const trans = unit.transcript;
        assets.push( {
          downloadUrl: trans.srcUrl,
          md5: trans.md5 || null,
          unitIndex,
          srcIndex: -1,
          assetType: 'transcript'
        } );
      }
      if ( unit.srt ) {
        assets.push( {
          downloadUrl: unit.srt.srcUrl,
          md5: unit.srt.md5 || null,
          unitIndex,
          srcIndex: -1,
          assetType: 'srt'
        } );
      }
    } );
    return assets;
  }

  /**
   * Updates an asset's downloadUrl, streamUrl and md5 based on the unitIndex and srcIndex
   * stored in the asset object. This is okay since under all circumstances
   * the asset would have been iterated over using the objects obtained from
   * the getAssets method above.
   *
   * @param asset { downloadUrl, streamUrl, md5, unitIndex, srcIndex, assetType }
   */
  putAsset( asset ) {
    if ( asset.assetType === 'source' ) {
      if ( asset.unitIndex !== null && asset.srcIndex !== null ) {
        const source = this.body.unit[asset.unitIndex].source[asset.srcIndex];
        source.downloadUrl = asset.downloadUrl;
        source.stream = asset.stream;
        source.md5 = asset.md5;
        source.size = asset.size;
        source.duration = asset.duration;
      } else {
        console.log( 'attempting to update asset via hash' );
        this.body.unit.forEach( ( unit ) => {
          unit.source.forEach( ( src ) => {
            const temp = src;
            if ( src.md5 === asset.md5 ) {
              console.log( 'found match, updating stream', asset.stream );
              temp.stream = asset.stream;
            }
          } );
        } );
      }
    } else {
      this.body.unit[asset.unitIndex][asset.assetType].srcUrl = asset.downloadUrl;
      this.body.unit[asset.unitIndex][asset.assetType].md5 = asset.md5;
    }
  }

  /**
   * Returns an array of language units
   *
   * @returns {Array}
   */
  // eslint-disable-next-line class-methods-use-this
  getUnits( json ) {
    return json.unit;
  }
}

export default Video;
