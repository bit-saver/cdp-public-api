import { Router } from 'express';
import apiErrorHandler from './modules/errorHandler';
import { cleanTempFilesCtrl, cleanTempFilesErrorCtrl } from '../middleware/cleanTempFiles';

import adminRoutes from './admin/routes';
import searchRoutes from './search/routes';
import videoRoutes from './resources/video/routes';
import postRoutes from './resources/post/routes';
import courseRoutes from './resources/course/routes';
import languageRoutes from './resources/language/routes';
import taxonomyRoutes from './resources/taxonomy/routes';
import ownerRoutes from './resources/owner/routes';
import zipRoutes from './tasks/zip/routes';
import authRoutes, { requireAuth } from './modules/controllers/authentication';

const router = new Router();

// Regex route rule
// Runs all non public routes thru token authentication
router.use( /\/(admin|video|post|course|language|taxonomy|owner)\/?.*$/i, requireAuth );

// public routes -- /v1/search, etc., v1 comes from app.use in index.js
router.use( '/search', searchRoutes );
router.use( '/zip', zipRoutes );

router.use( '/auth', authRoutes );

// admin routes
router.use( '/admin', adminRoutes );

// resources
router.use( '/video', videoRoutes );
router.use( '/post', postRoutes );
router.use( '/course', courseRoutes );
router.use( '/language', languageRoutes );
router.use( '/taxonomy', taxonomyRoutes );
router.use( '/owner', ownerRoutes );

router.use( cleanTempFilesCtrl );

// Catch all errors
router.use( cleanTempFilesErrorCtrl );
router.use( apiErrorHandler );

export default router;
