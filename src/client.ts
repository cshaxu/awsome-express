import {
  CopyObjectCommandOutput,
  DeleteObjectCommandOutput,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import { BASE_URL } from './config.js';

async function createPresignedPost(
  bucket: string,
  key: string,
): Promise<PresignedPost> {
  const url = `${BASE_URL}/create-presigned-post`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Bucket: bucket, Key: key }),
  });
  return await response.json();
}

async function createPresignedUrl(
  bucket: string,
  key: string,
): Promise<string> {
  const url = `${BASE_URL}/create-presigned-url`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Bucket: bucket, Key: key }),
  });
  return await response.text();
}

async function headObject(bucket: string, key: string): Promise<Headers> {
  const url = `${BASE_URL}/object?Bucket=${bucket}&Key=${key}`;
  const response = await fetch(url, { method: 'HEAD' });
  return response.headers;
}

export async function getObject(bucket: string, key: string): Promise<Blob> {
  const url = `${BASE_URL}/object?Bucket=${bucket}&Key=${key}`;
  const response = await fetch(url, { method: 'GET' });
  return await response.blob();
}

async function putObject(
  bucket: string,
  key: string,
  file: File,
): Promise<PutObjectCommandOutput> {
  const url = `${BASE_URL}/put-object`;
  const formData = new FormData();
  formData.append('Bucket', bucket);
  formData.append('Key', key);
  formData.append('file', file);
  const response = await fetch(url, { method: 'POST', body: formData });
  return await response.json();
}

async function streamObject(
  bucket: string,
  key: string,
): Promise<PutObjectCommandOutput> {
  const url = `${BASE_URL}/stream-object`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Bucket: bucket, Key: key }),
  });
  return await response.json();
}

async function copyObject(
  copySource: string,
  bucket: string,
  key: string,
): Promise<CopyObjectCommandOutput> {
  const url = `${BASE_URL}/copy-object`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CopySource: copySource, Bucket: bucket, Key: key }),
  });
  return await response.json();
}

async function deleteObject(
  bucket: string,
  key: string,
): Promise<DeleteObjectCommandOutput> {
  const url = `${BASE_URL}/delete-object`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Bucket: bucket, Key: key }),
  });
  return await response.json();
}

const S3ExpressApiClient = {
  createPresignedPost,
  createPresignedUrl,
  headObject,
  getObject,
  putObject,
  streamObject,
  copyObject,
  deleteObject,
};

export default S3ExpressApiClient;
