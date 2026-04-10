/* istanbul ignore file */

import app from './app.js';
import { HOST, PORT } from './config.js';
import { logInfo } from './utils/log.js';

app.listen(Number(PORT), HOST, () =>
  logInfo(`Server running on ${HOST}:${PORT}`),
);
