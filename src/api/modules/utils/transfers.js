import * as utils from '.';
import Download from '../download';
import { exec as mediainfo } from 'mediainfo-parser';
import aws from '../../../services/amazon-aws';
import vimeo from '../../../services/vimeo';

export class Parcel {
  constructor( props ) {
    this.downQueue = 0;
    this.upQueue = 0;
    this.model = props.model;
    this.requestId = props.model.getRequestId();
    this.req = props.req;
    this.res = props.res;
    this.next = props.next;
  }

  getModel() {
    return this.model;
  }

  getReq() {
    return this.req;
  }

  pushUp() {
    this.upQueue += 1;
  }

  pushDown() {
    this.downQueue += 1;
  }

  popUp() {
    this.upQueue -= 1;
    if ( this.upQueue < 0 ) this.upQueue = 0;
  }

  popDown() {
    this.downQueue -= 1;
    if ( this.downQueue < 0 ) this.downQueue = 0;
  }
}

/**
 * Uses the Content-Type defined in the header of a response
 * from the provided URL. If the Content-Type found in the header
 * is in the list of allowed content types then true is returned.
 *
 * @param url
 * @returns {Promise<boolean>}
 */
export const isTypeAllowed = async ( url ) => {
  const contentType = await utils.getTypeFromUrl( url );
  if ( !contentType ) return false;
  const allowedTypes = utils.getContentTypes();
  return allowedTypes.includes( contentType );
};

export const downloadAsset = async ( url, requestId ) => {
  const download = await Download( url, requestId );
  return download;
};

export const uploadAsset = async ( reqBody, download ) => {
  let d = null;
  if ( reqBody.published ) d = new Date( reqBody.published );
  else d = new Date(); // use current date as fallback
  let month = d.getMonth() + 1; // month is a 0 based index
  if ( month < 10 ) month = `0${month}`; // leading 0
  const title = `${d.getFullYear()}/${month}/${reqBody.site}_${reqBody.post_id}/${
    download.props.md5
  }`;
  const result = await aws.upload( {
    title,
    ext: download.props.ext,
    filePath: download.filePath
  } );
  return result;
};

export const updateAsset = ( model, asset, result, md5 ) => {
  // Modify the original request by:
  // replacing the downloadUrl and adding a checksum
  model.putAsset( {
    ...asset,
    downloadUrl: result.Location || '',
    stream: result.stream || null,
    size: result.size || null,
    duration: result.duration || null,
    md5
  } );
};

export const uploadVimeo = async ( download, token, props = {} ) => {
  const result = await vimeo.upload( download.filePath, token, props );
  return result;
};

export const getVideoProperties = download => new Promise( ( resolve, reject ) => {
  mediainfo( download.filePath, ( err, result ) => {
    if ( err ) {
      console.error( 'MEDIAINFO ENCOUNTERED AN ERROR', '\r\n', err );
      return resolve( null );
    }
    if (
      !result.media ||
      !result.media.track ||
      result.media.track.length < 1 ||
      typeof result.media.track.forEach !== 'function'
    ) {
      console.error(
        'MediaInfo could not obtain properties...',
        '\r\n',
        JSON.stringify( result.media, null, 2 )
      );
      return reject( new Error( 'No media info.' ) );
    }
    const props = {
      size: {
        width: null,
        height: null,
        filesize: null,
        bitrate: null
      },
      duration: null
    };
    result.media.track.forEach( ( data ) => {
      if ( data._type === 'General' ) {
        props.size.filesize = data.filesize;
        props.size.bitrate = data.overallbitrate;
        props.duration = data.duration;
      } else if ( data._type === 'Video' ) {
        props.size.width = data.width;
        props.size.height = data.height;
      }
    } );
    console.log( 'mediainfo', JSON.stringify( props, null, 2 ) );
    resolve( props );
  } );
} );
