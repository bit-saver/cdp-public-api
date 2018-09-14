// this will be moved to the admin node server when v2 is released
import { Router } from 'express';
import controller from './controller';

const router = new Router();

router.route( '/language' ).post( controller.detect );

export default router;
