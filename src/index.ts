/* istanbul ignore file */

import app from './app.js';
import { HOST, PORT } from './config.js';

app.listen(Number(PORT), HOST, () =>
  console.log(`Server running on port ${PORT}`),
);
