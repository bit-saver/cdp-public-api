import { Router } from 'express';
import * as controller from './controller';

const router = new Router();

router.route( '/download' ).post( controller.download );
router.route( '/opennet' ).get( controller.isOpenNet );

export default router;
