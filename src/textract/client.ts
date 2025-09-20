import {
  DocumentLocation,
  GetDocumentTextDetectionCommandOutput,
  StartDocumentTextDetectionCommandOutput,
} from '@aws-sdk/client-textract';
import { BASE_URL } from '../config.js';

async function startDocumentTextDetection(
  documentLocation: DocumentLocation,
): Promise<StartDocumentTextDetectionCommandOutput> {
  const url = `${BASE_URL}/textract/start-document-text-detection`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DocumentLocation: documentLocation }),
  });
  return await response.json();
}

async function getDocumentTextDetection(
  jobId: string,
  nextToken?: string,
): Promise<GetDocumentTextDetectionCommandOutput> {
  const url = `${BASE_URL}/textract/get-document-text-detection`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ JobId: jobId, NextToken: nextToken }),
  });
  return await response.json();
}

// not an AWS Textract API - for debugging only
async function listJobs(): Promise<{ Jobs: Array<any> }> {
  const url = `${BASE_URL}/textract/list-jobs`;
  const response = await fetch(url, { method: 'GET' });
  return await response.json();
}

const TextractApiClient = {
  startDocumentTextDetection,
  getDocumentTextDetection,
  listJobs,
};

export default TextractApiClient;
