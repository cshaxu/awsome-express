import {
  CopyObjectCommandOutput,
  DeleteObjectCommandOutput,
  HeadObjectCommandOutput,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import path from 'path';
import { BASE_URL, LOCAL_STORAGE_PATH } from './config.js';

async function createPresignedPost(
  Bucket: string,
  Key: string,
): Promise<PresignedPost> {
  const url = `${BASE_URL}/put-object`;
  return { url, fields: { Bucket, Key } };
}

async function createPresignedUrl(
  Bucket: string,
  Key: string,
): Promise<string> {
  return `${BASE_URL}/object/${Bucket}/${Key}`;
}

async function headObject(
  Bucket: string,
  Key: string,
): Promise<HeadObjectCommandOutput | null> {
  const filePath = path.join(LOCAL_STORAGE_PATH, Bucket, Key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const fileType = await fileTypeFromBuffer(buffer);
  const ContentType = fileType?.mime ?? 'application/octet-stream';
  return { ContentType, $metadata: {} };
}

async function getObject(
  Bucket: string,
  Key: string,
): Promise<{ ContentType: string; Body: Buffer } | null> {
  const filePath = path.join(LOCAL_STORAGE_PATH, Bucket, Key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const fileType = await fileTypeFromBuffer(buffer);
  const ContentType = fileType?.mime ?? 'application/octet-stream';
  return { ContentType, Body: buffer };
}

async function putObject(
  Bucket: string,
  Key: string,
  Body: Buffer,
): Promise<PutObjectCommandOutput> {
  const filePath = path.join(LOCAL_STORAGE_PATH, Bucket, Key);
  // create folder if not exists
  const folderPath = path.dirname(filePath);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  // write file
  fs.writeFileSync(filePath, Body);
  return { $metadata: {} };
}

async function copyObject(
  CopySource: string,
  Bucket: string,
  Key: string,
): Promise<CopyObjectCommandOutput | null> {
  const oldFilePath = path.join(LOCAL_STORAGE_PATH, CopySource);
  if (!fs.existsSync(oldFilePath)) {
    return null;
  }
  const newFilePath = path.join(LOCAL_STORAGE_PATH, Bucket, Key);
  fs.copyFileSync(oldFilePath, newFilePath);
  return { $metadata: {} };
}

async function deleteObject(
  Bucket: string,
  Key: string,
): Promise<DeleteObjectCommandOutput | null> {
  const filePath = path.join(LOCAL_STORAGE_PATH, Bucket, Key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  fs.unlinkSync(filePath);
  return { $metadata: {} };
}

const Service = {
  createPresignedPost,
  createPresignedUrl,
  headObject,
  getObject,
  putObject,
  copyObject,
  deleteObject,
};

export default Service;
