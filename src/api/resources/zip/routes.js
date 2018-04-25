import { Router } from 'express';
import controller from './controller';

const router = new Router();

router.route( '/' ).post( controller );

export default router;
