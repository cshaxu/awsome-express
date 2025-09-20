import { LOCAL_STORAGE_PATH } from '@/config.js';
import { NextFunction, Request, Response, Router } from 'express';
import helmet from 'helmet';

const ViewRouter = Router();

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
    connectSrc: ["'self'", 'http:', 'https:'],
  };
  helmet.contentSecurityPolicy({ directives })(req, res, next);
}

ViewRouter.get<{}, { message: string }>('/', applyCsp, (_req, res) => {
  res.render('view/home', { path: LOCAL_STORAGE_PATH, res });
});

ViewRouter.get<{}, { message: string }>('/s3', applyCsp, (_req, res) => {
  res.render('view/s3', { res });
});

ViewRouter.get<{}, { message: string }>('/textract', applyCsp, (_req, res) => {
  res.render('view/textract', { res });
});

export default ViewRouter;
