/**
 * Netlify serverless function that runs the Express API.
 * Requests to /api/* are rewritten to this function.
 */
import serverless from 'serverless-http';
import { app } from '../../backend/src/app.js';

export const handler = serverless(app);
