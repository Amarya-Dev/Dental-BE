import { setupDatabase } from './config/db.js';
import express from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import https from 'https';
import http from 'http';
import routes from './v1/profile/routes/routes.js'
import { runCronJobs } from './cron_jobs/schedulers.js';
import { createS3Bucket, createDefaultFolder } from './utils/upload.js';
import { sendWarningsToDoctors } from './cron_jobs/cronFunctions.js';
config();

(async () => {
  await setupDatabase();

  const app = express();
  app.use(express.json());
  app.use(cors("*"));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const corsOptions = {
    origin: ['http://localhost:3000', "https://dental-insight-studio-react-fork-pxmn.vercel.app"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    credentials: true,
  };
  
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use('/api/v1', routes);
  app.use('/', (req, res) => {
    res.send("Hey, I'm online now with HTTPS!!");
  });
  
  await runCronJobs();
  await createS3Bucket()

  const PORT = process.env.PORT || 4000;
  let sslOptions={}
  const ENVIRONMENT = process.env.ENVIRONMENT
  // Load SSL certificate
  if(ENVIRONMENT=='production'){
    sslOptions = {
      key: fs.readFileSync(process.env.PRIV_KEY_PEM),
      cert: fs.readFileSync(process.env.FULL_CHAIN_KEY_PEM)
    };
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`Server is running on HTTPS port ${PORT}`);
    });
  }else{
    http.createServer(app).listen(PORT, () => {
      console.log(`Server is running on HTTP port ${PORT}`);
    });
  }

  // Start HTTPS Server on the specified port

})();