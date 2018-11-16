import request from 'request';

export const download = ( req, res, next ) => {
  res.setHeader( 'content-disposition', `attachment; filename=${req.body.filename}` );
  request.get( req.body.url ).pipe( res );
};

/**
 * Converts a string IP address (#.#.#.#) to an integer.
 *
 * @param ip
 * @returns {number}
 */
const ipToNum = ip => Number( ip.split( '.' )
  .map( d => `000${d}`.substr( -3 ) )
  .join( '' ) );

/**
 * Compares the given IP to the given range to determine if falls within it (inclusively).
 *
 * @param ip
 * @param range
 * @returns {boolean}
 */
const checkRange = ( ip, range ) => {
  let { start, end } = range;
  start = ipToNum( start );
  if ( end ) end = ipToNum( end );
  else end = start;
  return ip >= start && ip <= end;
};

/**
 * Retrieves and parses OpenNet IP ranges from the env file.
 *
 * @returns []
 */
const getOpenNetIPs = () => {
  const rangesStr = process.env.OPENNET_IPS || '';
  const ranges = [];
  rangesStr.split( ' ' ).forEach( ( rangeStr ) => {
    const rangeArgs = rangeStr.split( ':' );
    ranges.push( {
      start: rangeArgs[0],
      end: rangeArgs[1]
    } );
  } );
  return ranges;
};

/**
 * Determines if the client's IP address is within the range of
 * OpenNet IP addresses.
 *
 * @param req
 * @param res
 * @returns {*}
 */
export const isOpenNet = ( req, res ) => {
  const ip = ( req.headers['x-forwarded-for'] || '' ).split( ',' ).pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  if ( !ip ) return res.json( { error: 1, message: 'IP Address not found.', isOpenNet: false } );
  const ipnum = ipToNum( ip );
  const OpenNetIPs = getOpenNetIPs();
  let openNet = false;
  OpenNetIPs.forEach( ( range ) => {
    if ( checkRange( ipnum, range ) ) openNet = true;
  } );
  return res.json( {
    error: 0,
    isOpenNet: openNet
  } );
};
