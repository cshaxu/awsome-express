import { upload } from '@/multer.js';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import createHttpError from 'http-errors';
import { LOCAL_STORAGE_PATH } from './config.js';
import Service from './service.js';

function applyCsp(req: Request, res: Response, next: NextFunction) {
  res.locals.nonce = crypto.randomUUID();
  const nonce = `'nonce-${res.locals.nonce}'`;
  const apisGoogleCom = 'https://apis.google.com';
  const scriptSrcElem = ["'self'", nonce, apisGoogleCom];
  const scriptSrcAttr = ["'self'", "'unsafe-inline'"];
  const contentGoogleApisCom = 'https://content.googleapis.com';
  const docsGoogleCom = 'https://docs.google.com';
  const frameSrc = [contentGoogleApisCom, docsGoogleCom];
  const directives = {
    scriptSrcElem,
    scriptSrcAttr,
    'img-src': ["'self'", 'https: data:'],
    frameSrc,
  };
  helmet.contentSecurityPolicy({ directives })(req, res, next);
}

const router = express.Router();

router.post('/create-presigned-post', async (req, res, next) => {
  const { Bucket, Key } = req.body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  const presignedPost = await Service.createPresignedPost(Bucket, Key);
  res.json(presignedPost);
});

router.post('/create-presigned-url', async (req, res, next) => {
  const { Bucket, Key } = req.body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  const url = await Service.createPresignedUrl(Bucket, Key);
  res.send(url);
});

router.head('/object/:Bucket/*', async (req, res, next) => {
  const { Bucket } = req.params;
  const Key = (req.params as any)[0];
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const headObject = await Service.headObject(Bucket, Key);
    if (headObject === null) {
      return next(createHttpError.NotFound(`File not found: ${Bucket}/${Key}`));
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

router.post('/head-object', async (req, res, next) => {
  const { Bucket, Key } = req.body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const headObject = await Service.headObject(Bucket, Key);
    if (headObject === null) {
      return next(createHttpError.NotFound(`File not found: ${Bucket}/${Key}`));
    }
    res.json(headObject);
  } catch (error) {
    next(error);
  }
});

router.get('/object/:Bucket/*', async (req, res, next) => {
  const { Bucket } = req.params;
  const Key = (req.params as any)[0];
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const object = await Service.getObject(Bucket, Key);
    if (object === null) {
      return next(createHttpError.NotFound(`File not found: ${Bucket}/${Key}`));
    }
    const { ContentType, Body } = object;
    res.setHeader('Content-Type', ContentType);
    res.send(Body);
  } catch (error) {
    next(error);
  }
});

router.post('/get-object', async (req, res, next) => {
  const { Bucket, Key } = req.body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const object = await Service.getObject(Bucket, Key);
    if (object === null) {
      return next(createHttpError.NotFound(`File not found: ${Bucket}/${Key}`));
    }
    const { ContentType, Body } = object;
    res.setHeader('Content-Type', ContentType);
    res.send(Body);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/object/:Bucket/*',
  upload.single('Body'),
  async (req, res, next) => {
    const { Bucket } = req.params;
    const Key = (req.params as any)[0];
    if (typeof Bucket !== 'string') {
      return next(createHttpError.BadRequest('Missing `Bucket`'));
    }
    if (typeof Key !== 'string') {
      return next(createHttpError.BadRequest('Missing `Key`'));
    }
    const { file } = req;
    if (file === undefined) {
      return next(createHttpError.BadRequest('Missing `Body`'));
    }

    try {
      const putObject = await Service.putObject(Bucket, Key, file.buffer);
      res.json(putObject);
    } catch (error) {
      next(error);
    }
  },
);

router.post('/put-object', upload.single('file'), async (req, res, next) => {
  const { file, body } = req;
  const { Bucket, Key } = body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }
  if (file === undefined) {
    return next(createHttpError.BadRequest('Missing `file`'));
  }

  try {
    const putObject = await Service.putObject(Bucket, Key, file.buffer);
    res.json(putObject);
  } catch (error) {
    next(error);
  }
});

router.post('/copy-object', async (req, res, next) => {
  const { CopySource, Bucket, Key } = req.body;
  if (typeof CopySource !== 'string') {
    return next(createHttpError.BadRequest('Missing `CopySource`'));
  }
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const copyObject = await Service.copyObject(CopySource, Bucket, Key);
    if (copyObject === null) {
      return next(createHttpError.NotFound(`File not found: ${CopySource}`));
    }
    res.json(copyObject);
  } catch (error) {
    next(error);
  }
});

router.delete('/object/:Bucket/*', async (req, res, next) => {
  const { Bucket } = req.params;
  const Key = (req.params as any)[0];
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const deleteObject = await Service.deleteObject(Bucket, Key);
    if (deleteObject === null) {
      return next(createHttpError.NotFound(`File not found: ${Bucket}/${Key}`));
    }
    res.json(deleteObject);
  } catch (error) {
    next(error);
  }
});

router.post('/delete-object', async (req, res, next) => {
  const { Bucket, Key } = req.body;
  if (typeof Bucket !== 'string') {
    return next(createHttpError.BadRequest('Missing `Bucket`'));
  }
  if (typeof Key !== 'string') {
    return next(createHttpError.BadRequest('Missing `Key`'));
  }

  try {
    const deleteObject = await Service.deleteObject(Bucket, Key);
    res.json(deleteObject);
  } catch (error) {
    next(error);
  }
});

router.get<{}, { message: string }>('/', applyCsp, (_req, res) => {
  res.render('home', { path: LOCAL_STORAGE_PATH, res });
});

export default router;
