import { Router } from 'express';
import * as controller from './controller';

const router = new Router();

router.route( '/download/:opts/:filename' ).get( controller.download );
// Below is only kept for backwards compatability but should be reomved eventually
router.route( '/download/:opts' ).get( controller.download );
router.route( '/download' ).post( controller.download );
router.route( '/opennet' ).get( controller.isOpenNet );

export default router;
