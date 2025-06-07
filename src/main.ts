import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {router as apiRouter} from './routes/api.js';

dotenv.config();

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('✅ MongoDB connected');

  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('CookieGuard API läuft 🎉');
  });

  app.use('/v1', apiRouter);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log('✅ Server läuft auf http://localhost:' + PORT);
  });
}

bootstrap().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
