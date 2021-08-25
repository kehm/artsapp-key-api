import Sequelize from 'sequelize';
import Media from '../lib/database/models/Media.js';
import MediaInfo from '../lib/database/models/MediaInfo.js';

/**
 * Get media element info for each media object
 *
 * @param {Array} media Media objects with IDs
 * @returns {Array} Updated media objects
 */
const getMediaElements = async (media) => {
    const mediaInfo = await Media.findAll({
        include: [
            {
                model: MediaInfo,
                attributes: ['title', 'languageCode'],
            },
        ],
        where: {
            id: { [Sequelize.Op.in]: media.map((element) => element.id) },
        },
    });
    const mediaElements = [...media];
    if (Array.isArray(mediaElements)) {
        mediaElements.forEach((element) => {
            const info = mediaInfo.filter((inf) => inf.id === element.id);
            if (info.length > 0) {
                element.title = {};
                info.forEach((inf) => { element.title[inf.languageCode] = inf.title; });
            }
            element.mediaElement = [
                {
                    url: `${process.env.API_URL}/media/thumbnails/${element.id}`,
                    width: 128,
                    height: 128,
                },
                {
                    url: `${process.env.API_URL}/media/${element.id}`,
                },
            ];
        });
    }
    return mediaElements;
};

export default getMediaElements;
