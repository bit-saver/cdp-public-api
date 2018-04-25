import { Router } from 'express';
import apiErrorHandler from './modules/errorHandler';
import cleanTempFilesCtrl from '../middleware/cleanTempFiles';

import adminRoutes from './admin/routes';
import searchRoutes from './search/routes';
import videoRoutes from './resources/video/routes';
import postRoutes from './resources/post/routes';
import courseRoutes from './resources/course/routes';
import languageRoutes from './resources/language/routes';
import taxonomyRoutes from './resources/taxonomy/routes';
import ownerRoutes from './resources/owner/routes';
import zipRoutes from './resources/zip/routes';
import testRoutes from './test';

const router = new Router();

// admin routes
router.use( '/admin', adminRoutes );

// search -- /v1/search, etc., v1 comes from app.use in index.js
router.use( '/search', searchRoutes );

// resources
router.use( '/video', videoRoutes );
router.use( '/post', postRoutes );
router.use( '/course', courseRoutes );
router.use( '/language', languageRoutes );
router.use( '/taxonomy', taxonomyRoutes );
router.use( '/owner', ownerRoutes );
router.use( '/zip', zipRoutes );

// test
router.use( '/test', testRoutes );

router.use( cleanTempFilesCtrl );

// Catch all errors
router.use( apiErrorHandler );

export default router;
