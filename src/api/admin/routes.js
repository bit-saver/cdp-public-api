import { Router } from 'express';
import * as controller from './controller';

const router = new Router();

// Route: /v1/admin/elastic/indices
router
  .route( '/elastic/indices' )
  .post( controller.create )
  .delete( controller.remove );

router.route( '/elastic/indices/reindex' ).post( controller.reindex );

router
  .route( '/elastic/indices/mapping' )
  .put( controller.putMapping )
  .post( controller.getMapping );

// router.route( '/elastic/indices/reindex' ).post( controller.indicesReindex );

export default router;
