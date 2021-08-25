import express from 'express';
import { param } from 'express-validator';
import fs from 'fs';
import path from 'path';
import Media from '../lib/database/models/Media.js';
import isValidInput from '../middleware/input.js';
import { logError } from '../utils/logger.js';

/**
 * Routes for serving media
 */
const router = express.Router();

/**
 * Get media file
 */
router.get('/:mediaId', [
    param('mediaId').isInt(),
], isValidInput, async (req, res) => {
    try {
        const media = await Media.findByPk(req.params.mediaId);
        if (media && media.filePath) {
            if (fs.existsSync(media.filePath)) {
                const resolvedPath = path.resolve(media.filePath);
                res.sendFile(resolvedPath);
            } else {
                logError('File path does not exist');
                res.sendStatus(500);
            }
        } else res.sendStatus(404);
    } catch (err) {
        logError('Could not get media file', err);
        res.sendStatus(500);
    }
});

/**
 * Get media file thumbnail
 */
router.get('/thumbnails/:mediaId', [
    param('mediaId').isInt(),
], isValidInput, async (req, res) => {
    try {
        const media = await Media.findByPk(req.params.mediaId);
        if (media && media.thumbnailPath) {
            if (fs.existsSync(media.thumbnailPath)) {
                const resolvedPath = path.resolve(media.thumbnailPath);
                res.sendFile(resolvedPath);
            } else {
                logError('File path does not exist');
                res.sendStatus(500);
            }
        } else res.sendStatus(404);
    } catch (err) {
        logError('Could not get media file thumbnail', err);
        res.sendStatus(500);
    }
});

export default router;
