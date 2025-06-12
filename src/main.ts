import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['MONGO_URI', 'DOMAINS'];
const missing = requiredEnv.filter(v => !process.env[v]);
if (missing.length) {
  missing.forEach(v => console.error(`Missing env var ${v}`));
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get('/', (_req: express.Request, res: express.Response) => {
  res.send('CookieGuard API läuft 🎉');
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log('✅ Server läuft auf http://localhost:' + PORT);
});
