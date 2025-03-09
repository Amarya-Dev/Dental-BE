import { setupDatabase } from './config/db.js';
import express, { json } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import routes from './v1/profile/routes/routes.js'

import { runCronJobs } from './cron_jobs/schedulers.js';
import { createS3Bucket, createDefaultFolder } from './utils/upload.js';
import { sendWarningsToDoctors } from './cron_jobs/cronFunctions.js';
(async () => {
  await setupDatabase();

  const app = express();
  config();
  app.use(express.json());
  app.use(cors("*"));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const corsOptions = {
    origin: ['http://localhost:3000', "https://dental-insight-studio-react-fork-pxmn.vercel.app"], // Add your frontend's URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'], // Explicitly allow necessary headers
    credentials: true,  // Allows sending cookies & Authorization headers
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Import & Define API versions
  app.use('/api/v1', routes);
  // await createS3Bucket();
  // await createDefaultFolder();
  // await sendWarningsToDoctors()
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