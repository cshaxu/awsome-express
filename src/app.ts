import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { catchError, endRoute } from './middleware.js';
import route from './route.js';
const app = express();
// app.use('/static', express.static('static'));

// view engine setup
app.set('views', 'src');
app.set('view engine', 'ejs');

// default middlewares
app.use(morgan('dev'));
app.use(helmet());
// cors - this is definitely not for production
app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (_req, res) => res.status(204));

// business logic routes
app.use('/', route);

// final middlewares
app.use(endRoute);
app.use(catchError);

export default app;
