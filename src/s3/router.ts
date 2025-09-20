import { upload } from '@/s3/multer.js';
import { Router } from 'express';
import createHttpError from 'http-errors';
import S3Service from './service.js';
import {
  CopyObjectBody,
  CreateSignedPostBody,
  CreateSignedUrlBody,
  DeleteObjectBody,
  GetObjectBody,
  HeadObjectBody,
  PutObjectBody,
} from './types.js';

const S3Router = Router();

S3Router.post('/create-presigned-post', async (req, res, next) => {
  try {
    const { Bucket, Key } = await CreateSignedPostBody.parseAsync(req.body);
    const presignedPost = await S3Service.createPresignedPost(Bucket, Key);
    res.json(presignedPost);
  } catch (error) {
    next(error);
  }
});

S3Router.post('/create-presigned-url', async (req, res, next) => {
  try {
    const { Bucket, Key } = await CreateSignedUrlBody.parseAsync(req.body);
    const url = await S3Service.createPresignedUrl(Bucket, Key);
    res.send(url);
  } catch (error) {
    next(error);
  }
});

S3Router.head('/object/:Bucket/*', async (req, res, next) => {
  try {
    const params = { Bucket: req.params.Bucket, Key: (req.params as any)[0] };
    const { Bucket, Key } = await HeadObjectBody.parseAsync(params);
    const headObject = await S3Service.headObject(Bucket, Key);
    if (headObject === null) {
      return next(
        createHttpError.NotFound(`File not found: "${Bucket}/${Key}"`),
      );
    }
    const { ContentType } = headObject;
    if (ContentType === undefined) {
      return next(createHttpError.InternalServerError('Missing `ContentType`'));
    }
    res.setHeader('Content-Type', ContentType);
    res.status(200).end();
  } catch (error) {
    next(error);
  }
});

S3Router.post('/head-object', async (req, res, next) => {
  try {
    const { Bucket, Key } = await HeadObjectBody.parseAsync(req.body);
    const headObject = await S3Service.headObject(Bucket, Key);
    if (headObject === null) {
      return next(
        createHttpError.NotFound(`File not found: "${Bucket}/${Key}"`),
      );
    }
    res.json(headObject);
  } catch (error) {
    next(error);
  }
});

S3Router.get('/object/:Bucket/*', async (req, res, next) => {
  try {
    const params = { Bucket: req.params.Bucket, Key: (req.params as any)[0] };
    const { Bucket, Key } = await GetObjectBody.parseAsync(params);
    const object = await S3Service.getObject(Bucket, Key);
    if (object === null) {
      return next(
        createHttpError.NotFound(`File not found: "${Bucket}/${Key}"`),
      );
    }
    const { ContentType, Body } = object;
    res.setHeader('Content-Type', ContentType);
    res.send(Body);
  } catch (error) {
    next(error);
  }
});

S3Router.post('/get-object', async (req, res, next) => {
  try {
    const { Bucket, Key } = await GetObjectBody.parseAsync(req.body);
    const object = await S3Service.getObject(Bucket, Key);
    if (object === null) {
      return next(
        createHttpError.NotFound(`File not found: "${Bucket}/${Key}"`),
      );
    }
    const { ContentType, Body } = object;
    res.setHeader('Content-Type', ContentType);
    res.send(Body);
  } catch (error) {
    next(error);
  }
});

S3Router.put(
  '/object/:Bucket/*',
  upload.single('Body'),
  async (req, res, next) => {
    try {
      const params = { Bucket: req.params.Bucket, Key: (req.params as any)[0] };
      const { Bucket, Key } = await PutObjectBody.parseAsync(params);
      const { file } = req;
      if (file === undefined) {
        return next(createHttpError.BadRequest('Missing `Body`'));
      }
      const putObject = await S3Service.putObject(Bucket, Key, file.buffer);
      res.json(putObject);
    } catch (error) {
      next(error);
    }
  },
);

S3Router.post('/put-object', upload.single('file'), async (req, res, next) => {
  try {
    const { file, body } = req;
    const { Bucket, Key } = await PutObjectBody.parseAsync(body);
    if (file === undefined) {
      return next(createHttpError.BadRequest('Missing `file`'));
    }
    const putObject = await S3Service.putObject(Bucket, Key, file.buffer);
    res.json(putObject);
  } catch (error) {
    next(error);
  }
});

S3Router.post('/copy-object', async (req, res, next) => {
  try {
    const { CopySource, Bucket, Key } = await CopyObjectBody.parseAsync(
      req.body,
    );
    const copyObject = await S3Service.copyObject(CopySource, Bucket, Key);
    if (copyObject === null) {
      return next(createHttpError.NotFound(`File not found: "${CopySource}"`));
    }
    res.json(copyObject);
  } catch (error) {
    next(error);
  }
});

S3Router.delete('/object/:Bucket/*', async (req, res, next) => {
  try {
    const params = { Bucket: req.params.Bucket, Key: (req.params as any)[0] };
    const { Bucket, Key } = await DeleteObjectBody.parseAsync(params);
    const deleteObject = await S3Service.deleteObject(Bucket, Key);
    if (deleteObject === null) {
      return next(
        createHttpError.NotFound(`File not found: "${Bucket}/${Key}"`),
      );
    }
    res.json(deleteObject);
  } catch (error) {
    next(error);
  }
});

S3Router.post('/delete-object', async (req, res, next) => {
  try {
    const { Bucket, Key } = await DeleteObjectBody.parseAsync(req.body);
    const deleteObject = await S3Service.deleteObject(Bucket, Key);
    res.json(deleteObject);
  } catch (error) {
    next(error);
  }
});

export default S3Router;
