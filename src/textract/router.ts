import { Router } from 'express';
import { omit } from 'lodash-es';
import TextractService from './service.js';
import {
  GetDocumentTextDetectionBody,
  StartDocumentTextDetectionBody,
} from './types.js';

const TextractRouter = Router();

TextractRouter.post(
  '/start-document-text-detection',
  async (req, res, next) => {
    try {
      const { DocumentLocation } =
        await StartDocumentTextDetectionBody.parseAsync(req.body);
      const result =
        await TextractService.startDocumentTextDetection(DocumentLocation);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

TextractRouter.get('/get-document-text-detection', async (req, res, next) => {
  try {
    const { JobId } = await GetDocumentTextDetectionBody.parseAsync(req.query);
    const result = await TextractService.getDocumentTextDetection(JobId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

TextractRouter.post('/get-document-text-detection', async (req, res, next) => {
  try {
    const { JobId } = await GetDocumentTextDetectionBody.parseAsync(req.body);
    const result = await TextractService.getDocumentTextDetection(JobId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

TextractRouter.get('/list-jobs', async (_req, res, next) => {
  try {
    const jobs = TextractService.listJobs().Jobs.map((job) =>
      omit(job, ['Blocks']),
    );
    res.json({ Jobs: jobs });
  } catch (error) {
    next(error);
  }
});

export default TextractRouter;
