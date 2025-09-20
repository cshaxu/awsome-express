import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { catchError, endRoute } from './middleware.js';
import S3Router from './s3/router.js';
import TextractRouter from './textract/router.js';
import ViewRouter from './view/router.js';
const app = express();
// app.use('/static', express.static('static'));

// view engine setup
app.set('views', 'src');
app.set('view engine', 'ejs');

// default middlewares
app.use(morgan('dev'));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'http:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }),
);
// cors - this is definitely not for production
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
    maxAge: 86400,
  }),
);

// 添加额外的安全头
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

app.use(express.json());
app.get('/favicon.ico', (_req, res) => res.status(204));

// view routes
app.use('/', ViewRouter);

// business logic routes
app.use('/s3', S3Router);
app.use('/textract', TextractRouter);

// final middlewares
app.use(endRoute);
app.use(catchError);

export default app;
