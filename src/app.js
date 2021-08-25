import 'core-js/stable';
import 'regenerator-runtime/runtime';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import postgres from './config/postgres.js';
import baseRoute from './routes/base.js';
import { initAssociations } from './lib/database/utils/init.js';
import { logError, logInfo } from './utils/logger.js';

/**
 * Application entry point
 */
const app = express();

// Initialize middleware
app.use(express.json({ limit: '100mb' }));
app.use(cors());
app.use(helmet());
app.use(process.env.API_URL_BASE, baseRoute);

/**
 * Check database connection and start listening
 */
const run = async () => {
    try {
        await postgres.authenticate();
        await initAssociations();
        app.listen(process.env.PORT, () => logInfo(`Server started on port ${process.env.PORT} with URL base ${process.env.API_URL_BASE}`));
    } catch (err) {
        logError('PostgreSQL connection failed', err);
    }
};

run();
