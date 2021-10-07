import Sequelize from 'sequelize';
import Collections from '../lib/database/models/Collections.js';
import Group from '../lib/database/models/Group.js';
import GroupInfo from '../lib/database/models/GroupInfo.js';
import GroupParents from '../lib/database/models/GroupParents.js';
import Key from '../lib/database/models/Key.js';
import KeyInfo from '../lib/database/models/KeyInfo.js';
import KeyMedia from '../lib/database/models/KeyMedia.js';
import Languages from '../lib/database/models/Languages.js';
import Media from '../lib/database/models/Media.js';
import Publishers from '../lib/database/models/Publishers.js';
import Revision from '../lib/database/models/Revision.js';
import Revisions from '../lib/database/models/Revisions.js';
import getMediaElements from './media.js';

/**
 * Rename created at and updated at timestamps to match the JSON format
 *
 * @param {Object} key Key object
 * @returns {Object} Updated key object
 */
const renameTimestamps = (key) => {
    const tmp = { ...key };
    tmp.created = key.created_at;
    tmp.lastModified = key.updated_at;
    delete tmp.created_at;
    delete tmp.updated_at;
    return tmp;
};

/**
 * Create multi-language key title object and set languages array
 *
 * @param {Object} key Key object
 * @param {Array} keys Key array
 * @param {Array} languages Key languages
 * @param {Object} element Key element from array
 * @returns {Object} Updated key object
 */
const setLanguageInfo = (key, keys, languages, keyElement) => {
    const tmpKey = { ...key };
    const keyLangs = languages.filter((lang) => lang.keyId === keyElement.id);
    const title = { [keyElement['key_info.language_code']]: keyElement['key_info.title'] };
    if (keyLangs.length > 1) {
        const altKey = keys.find((alt) => alt.id === keyElement.id && alt !== keyElement);
        if (altKey) title[altKey['key_info.language_code']] = altKey['key_info.title'];
    }
    delete tmpKey['key_info.title'];
    delete tmpKey['key_info.language_code'];
    tmpKey.languages = keyLangs.map((lang) => lang.language_code);
    tmpKey.title = title;
    return tmpKey;
};

/**
 * Get media element objects for media
 *
 * @param {Array} media Media
 * @returns {Array} Media array with media URLs
 */
const getMediaObjects = (media) => media.map((element) => ({
    id: element,
    mediaElement: [
        {
            url: `${process.env.API_URL}/media/thumbnails/${element}`,
            width: 128,
            height: 128,
        },
        { url: `${process.env.API_URL}/media/${element}` },
    ],
}));

/**
 * Convert key groups hierarchy to classification (JSON schema definition)
 *
 * @param {Object} key Key object
 * @param {Array} groups Key groups array
 * @returns {Object} Updated key object
 */
const setKeyClassification = (key, groups) => {
    const tmpKey = { ...key };
    tmpKey.classification = [];
    const findGroup = (id, keyGroups) => {
        const keyGroup = groups.find((element) => element.id === id && element.key_group_info.languageCode === 'en');
        if (keyGroup) {
            keyGroups.unshift({
                id,
                scientificName: keyGroup.key_group_info.name,
            });
            if (keyGroup.key_group_parent) {
                findGroup(keyGroup.key_group_parent.parentId, keyGroups);
            }
        }
    };
    findGroup(key.key_group_id, tmpKey.classification);
    return tmpKey;
};

/**
 * Get list of all published keys (incl. titles, languages, key groups and collections)
 *
 * @returns {Array} Key list with titles
 */
export const getKeys = async () => {
    const promises = [];
    promises.push(Key.findAll({
        attributes: ['id', 'key_group_id', 'version', 'status', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']],
        include: [
            {
                model: KeyInfo,
                attributes: ['title', 'language_code'],
            },
        ],
        where: {
            status: { [Sequelize.Op.in]: ['PUBLISHED', 'BETA'] },
        },
        raw: true,
    }));
    promises.push(Languages.findAll());
    promises.push(Collections.findAll());
    promises.push(KeyMedia.findAll({ include: [{ model: Media }] }));
    promises.push(Group.findAll({
        include: [
            {
                model: GroupInfo,
                attributes: ['languageCode', 'name'],
            },
            {
                model: GroupParents,
                attributes: ['parentId'],
            },
        ],
    }));
    const [keys, languages, collections, media, groups] = await Promise.all(promises);
    const ids = new Set();
    const arr = [];
    keys.forEach((element) => {
        if (!ids.has(element.id)) {
            let key = { ...element };
            const keyColl = collections.filter((collection) => collection.keyId === element.id);
            key.collections = keyColl.map((collection) => collection.collectionId);
            const keyMedia = media.filter((medium) => medium.keyId === element.id);
            key.media = getMediaObjects(keyMedia.map((medium) => medium.mediaId));
            if (key.key_group_id) key = setKeyClassification(key, groups);
            delete key.key_group_id;
            key = setLanguageInfo(key, keys, languages, element);
            key = renameTimestamps(key);
            arr.push(key);
            ids.add(element.id);
        }
    });
    return arr;
};

/**
 * Get key info, collections, publishers and media
 *
 * @param {string} keyId Key ID
 * @param {string} revisionId Revision ID (optional)
 * @param {string} languageCode Language code
 * @returns {Array} Database responses
 */
const getKeyData = async (keyId, revisionId, languageCode) => {
    const promises = [];
    promises.push(Key.findAll({
        attributes: ['id', 'revisionId', 'key_group_id', 'version', 'status', 'created_at', 'updated_at', 'creators', 'contributors'],
        order: [['created_at', 'DESC']],
        include: [
            {
                model: KeyInfo,
                attributes: ['title', 'description', 'language_code'],
                where: languageCode ? { languageCode } : {},
            },
        ],
        where: {
            id: keyId,
            status: revisionId
                ? { [Sequelize.Op.in]: ['PUBLISHED', 'BETA', 'PRIVATE'] }
                : { [Sequelize.Op.in]: ['PUBLISHED', 'BETA'] },
        },
        raw: true,
    }));
    promises.push(Collections.findAll({ where: { keyId } }));
    promises.push(Publishers.findAll({ where: { keyId } }));
    promises.push(KeyMedia.findAll({ where: { keyId } }));
    promises.push(Group.findAll({
        include: [
            {
                model: GroupInfo,
                attributes: ['languageCode', 'name'],
            },
            {
                model: GroupParents,
                attributes: ['parentId'],
            },
        ],
    }));
    const responses = await Promise.all(promises);
    return responses;
};

/**
 * Format a single language key to match the JSON schema
 *
 * @param {Object} key Key object
 * @param {Array} collections Collections
 * @param {Array} publishers Publishers
 * @param {Array} media Media
 * @returns {Object} Formatted key object
 */
const formatKey = (key, collections, publishers, media, groups) => {
    let tmpKey = { ...key };
    tmpKey.publishers = publishers.map((publisher) => publisher.organizationId);
    tmpKey.collections = collections.map((collection) => collection.collectionId);
    tmpKey.media = media.map((medium) => medium.mediaId);
    tmpKey.title = tmpKey['key_info.title'];
    tmpKey.description = tmpKey['key_info.description'];
    tmpKey.language_code = tmpKey['key_info.language_code'];
    delete tmpKey['key_info.title'];
    delete tmpKey['key_info.description'];
    delete tmpKey['key_info.language_code'];
    delete tmpKey.revisionId;
    if (tmpKey.key_group_id) tmpKey = setKeyClassification(tmpKey, groups);
    delete tmpKey.key_group_id;
    tmpKey = renameTimestamps(tmpKey);
    return tmpKey;
};

/**
 * Get key with description and publisher info
 *
 * @param {string} id Key ID
 * @param {string} languageCode Language code
 * @returns {Object} Key with description and publisher info
 */
export const getKeyInfo = async (id, languageCode) => {
    const [keys, collections, publishers, media, groups] = await getKeyData(
        id,
        undefined,
        languageCode,
    );
    let key;
    if (keys.length > 0) key = formatKey(keys[0], collections, publishers, media, groups);
    if (key && key.media) key.media = getMediaObjects(key.media);
    return key;
};

/**
 * Get revision content
 *
 * @param {string} id Revision ID
 * @param {string} status Required revision status
 * @returns {Object} Revision content and media elements
 */
const getRevisionContent = async (id, status) => {
    const revision = await Revision.findOne({
        attributes: ['content', 'media', 'mode'],
        where: status ? {
            id,
            status,
        } : {
            id,
        },
    });
    let content;
    if (revision && revision.content) {
        content = {
            taxa: revision.content.taxa,
            characters: revision.content.characters,
            statements: revision.content.statements,
            mode: revision.mode,
        };
        if (revision.media && revision.media.mediaElements) {
            content.mediaElements = await getMediaElements(revision.media.mediaElements);
        }
    }
    return content;
};

/**
 * Get key in JSON matching the schema
 *
 * @param {string} keyId Key ID
 * @param {string} revisionId Revision ID (optional)
 * @returns {Array} Array of key in JSON format
 */
export const getKey = async (keyId, revisionId) => {
    const [keys, collections, publishers, media, groups] = await getKeyData(keyId, revisionId);
    let key;
    if (keys.length === 1) {
        key = formatKey(keys[0], collections, publishers, media, groups);
        key.title = { [key.language_code]: key.title };
        key.description = { [key.language_code]: key.description };
        delete key.language_code;
        key.revisionId = keys[0].revisionId;
    } else if (keys.length > 1) {
        key = keys[0];
        key.title = {};
        key.description = {};
        keys.forEach((element) => {
            key.title[element['key_info.language_code']] = element['key_info.title'];
            key.description[element['key_info.language_code']] = element['key_info.description'];
        });
        delete key['key_info.title'];
        delete key['key_info.description'];
        delete key['key_info.language_code'];
        key = renameTimestamps(key);
    }
    if (key && key.media) key.media = getMediaObjects(key.media);
    let revision;
    if (key && revisionId) {
        revision = await getRevisionContent(revisionId);
    } else if (key && key.revisionId) {
        revision = await getRevisionContent(key.revisionId, 'ACCEPTED');
        delete key.revisionId;
    }
    if (revision) {
        key.taxa = revision.taxa;
        key.characters = revision.characters;
        key.statements = revision.statements;
        key.mediaElements = revision.mediaElements;
        key.mode = revision.mode;
    }
    return key;
};

/**
 * Get key ID for revision
 *
 * @param {string} revisionId Revision ID
 * @returns {string} Key ID
 */
export const getRevisionKeyId = async (revisionId) => {
    const keyRevision = await Revisions.findOne({ where: { revisionId } });
    if (keyRevision) return keyRevision.keyId;
    return undefined;
};
