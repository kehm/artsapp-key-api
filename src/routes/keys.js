import express from 'express';
import { query, param } from 'express-validator';
import isValidInput from '../middleware/input.js';
import { getKey, getKeyInfo, getKeys, getRevisionKeyId } from '../utils/key.js';
import { logError } from '../utils/logger.js';

/**
 * Routes for serving keys
 */
const router = express.Router();

/**
 * Get key list
 */
router.get('/', async (req, res) => {
    try {
        const keys = await getKeys();
        res.status(200).json(keys);
    } catch (err) {
        logError('Could not get key list', err);
        res.sendStatus(500);
    }
});

/**
 * Get key by ID
 */
router.get('/:keyId', [
    param('keyId').isUUID(4),
], isValidInput, async (req, res) => {
    try {
        const key = await getKey(req.params.keyId);
        if (key) {
            res.status(200).json(key);
        } else res.sendStatus(404);
    } catch (err) {
        logError('Could not get key', err);
        res.sendStatus(500);
    }
});

/**
 * Get key info by ID
 */
router.get('/info/:keyId', [
    param('keyId').isUUID(4),
    query('language').custom((value) => {
        if (!['no', 'en'].some((element) => element === value)) throw new Error('Invalid value');
        return true;
    }).optional(),
], isValidInput, async (req, res) => {
    try {
        let key;
        if (req.query.language) {
            key = await getKeyInfo(req.params.keyId, req.query.language);
        } else {
            const promises = [
                getKeyInfo(req.params.keyId, 'no'),
                getKeyInfo(req.params.keyId, 'en'),
            ];
            key = await Promise.all(promises);
        }
        if (key) {
            res.status(200).json(key);
        } else res.sendStatus(404);
    } catch (err) {
        logError('Could not get key info', err);
        res.sendStatus(500);
    }
});

/**
 * Get key by revision ID
 */
router.get('/revision/:revisionId', [
    param('revisionId').isUUID(4),
], isValidInput, async (req, res) => {
    try {
        const keyId = await getRevisionKeyId(req.params.revisionId);
        if (keyId) {
            const key = await getKey(keyId, req.params.revisionId);
            if (key) {
                res.status(200).json(key);
            } else res.sendStatus(404);
        } else res.sendStatus(404);
    } catch (err) {
        logError('Could not get key revision', err);
        res.sendStatus(500);
    }
});

export default router;
