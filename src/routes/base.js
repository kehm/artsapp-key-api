import express from 'express';
import keysRoute from './keys.js';
import metadataRoute from './metadata.js';
import mediaRoute from './media.js';

/**
 * Base route
 */
const router = express.Router();

router.use('/keys', keysRoute);
router.use('/metadata', metadataRoute);
router.use('/media', mediaRoute);

export default router;
