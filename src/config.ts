import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3333;
export const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || '/tmp';
