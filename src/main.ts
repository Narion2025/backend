import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('CookieGuard API läuft 🎉');
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('✅ Server läuft auf http://localhost:' + PORT);
});
