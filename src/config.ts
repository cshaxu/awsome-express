import dotenv from 'dotenv';

dotenv.config();

export const HOST = process.env.HOST || 'localhost';
export const PORT = process.env.PORT || '3333';
export const BASE_URL = `http://${HOST}:${PORT}`;
export const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || '/tmp';
