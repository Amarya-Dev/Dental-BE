import { setupDatabase } from './config/db.js';
import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import routes from './v1/profile/routes/routes.js'

import { runCronJobs } from './cron_jobs/schedulers.js';
import { createS3Bucket, createDefaultFolder } from './utils/upload.js';
(async () => {
  await setupDatabase();

  const app = express();
  config();
  app.use(express.json());
  app.use(cors());

  // Import & Define API versions
  app.use('/api/v1', routes);
  // await createS3Bucket();
  // await createDefaultFolder();
  app.use('/', (req, res) => {
    res.send("Hey, I'm online now!!");
  });

  runCronJobs()
  // Start the server
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();