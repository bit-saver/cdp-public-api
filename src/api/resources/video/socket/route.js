import cuid from 'cuid';
import { generateControllers } from './controller';
import VideoModel from '../model';
import { validateSocket } from '../../../../middleware/validateSchema';
import { updateVideoCtrl, deleteAssetCtrl } from './updateAssets';

const controller = generateControllers( new VideoModel() );

const videoPaths = {
  PUT: [
    controller.setRequestDoc,
    validateSocket( VideoModel ),
    updateVideoCtrl( VideoModel ),
    controller.indexDocument
  ],
  DELETE: [
    controller.setRequestDoc,
    deleteAssetCtrl( VideoModel ),
    controller.deleteDocumentById
  ]
};

/**
 * Recreation of the express style routing for use with sockets.
 */
class VideoRouter {
  constructor( operation, client, req ) {
    this.client = client;
    this.path = [...videoPaths[operation]];
    if ( 'body' in req ) {
      this.req = req;
    } else if ( 'uuid' in req ) {
      this.req = { params: { uuid: req.uuid } };
    } else {
      this.req = {
        body: req
      };
    }
    if ( !this.req.headers ) this.req.headers = {};
    if ( !this.req.params ) this.req.params = {};
    this.req.requestId = cuid();
  }

  next() {
    if ( this.path.length > 0 ) {
      const func = this.path.shift();
      func( this.req, this.callback.bind( this ), this.callback.bind( this ) );
    }
  }

  callback( result ) {
    if ( result instanceof Error ) {
      this.client.send( {
        error: result.message,
        req: this.req
      } );
    } else if ( result ) {
      this.client.send( {
        req: this.req,
        result
      } );
    } else if ( this.path.length > 0 ) {
      this.next();
    } else {
      // We shouldn't reach this point as data or error should have returned by now.
      this.client.send( {
        error: 'End of line',
        req: this.req
      } );
    }
  }

  static route( operation, client, req ) {
    const router = new VideoRouter( operation, client, req );
    router.next();
  }
}

export default VideoRouter;
