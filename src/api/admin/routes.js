import { Router } from 'express';
import * as controller from './controller';

const router = new Router();

// Route: /v1/admin/elastic/indices
router
  .route( '/elastic/indices' )
  .post( controller.create )
  .delete( controller.remove );

router.route( '/elastic/indices/exists' ).post( controller.exists );
router.route( '/elastic/indices/reindex' ).post( controller.reindex );
router.route( '/elastic/indices/alias' ).put( controller.updateAlias );

export default router;
