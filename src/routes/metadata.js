import express from 'express';
import { query } from 'express-validator';
import Collection from '../lib/database/models/Collection.js';
import CollectionInfo from '../lib/database/models/CollectionInfo.js';
import Group from '../lib/database/models/Group.js';
import GroupInfo from '../lib/database/models/GroupInfo.js';
import Organization from '../lib/database/models/Organization.js';
import OrganizationInfo from '../lib/database/models/OrganizationInfo.js';
import isValidInput from '../middleware/input.js';
import { logError } from '../utils/logger.js';

/**
 * Routes for serving metadata
 */
const router = express.Router();

/**
 * Get list of organizations
 */
router.get('/organizations', [
    query('language').custom((value) => {
        if (!['no', 'en'].some((element) => element === value)) throw new Error('Invalid value');
        return true;
    }),
], isValidInput, async (req, res) => {
    try {
        const organizations = await Organization.findAll({
            attributes: ['id'],
            include: [{
                model: OrganizationInfo,
                attributes: ['fullName', 'shortName', 'description', 'homeUrl'],
                where: {
                    languageCode: req.query.language,
                },
            }],
        });
        res.status(200).json(organizations);
    } catch (err) {
        logError('Could not get organizations', err);
        res.sendStatus(500);
    }
});

/**
 * Get list of key groups
 */
router.get('/groups', [
    query('language').custom((value) => {
        if (!['no', 'en'].some((element) => element === value)) throw new Error('Invalid value');
        return true;
    }),
], isValidInput, async (req, res) => {
    try {
        const groups = await Group.findAll({
            attributes: ['id'],
            include: [{
                model: GroupInfo,
                attributes: ['name', 'description'],
                where: {
                    languageCode: req.query.language,
                },
            }],
        });
        res.status(200).json(groups);
    } catch (err) {
        logError('Could not get key groups', err);
        res.sendStatus(500);
    }
});

/**
 * Get list of key collections
 */
router.get('/collections', [
    query('language').custom((value) => {
        if (!['no', 'en'].some((element) => element === value)) throw new Error('Invalid value');
        return true;
    }),
], isValidInput, async (req, res) => {
    try {
        const collections = await Collection.findAll({
            attributes: ['id'],
            include: [{
                model: CollectionInfo,
                attributes: ['name', 'description'],
                where: {
                    languageCode: req.query.language,
                },
            }],
        });
        res.status(200).json(collections);
    } catch (err) {
        logError('Could not get key collections', err);
        res.sendStatus(500);
    }
});

export default router;
