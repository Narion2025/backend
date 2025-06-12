import mongoose from 'mongoose';
import 'dotenv/config';
import {crawl} from '../crawler/index.js';
import {Evaluation} from '../models/Evaluation.js';

const requiredEnv = ['MONGO_URI', 'DOMAINS'];
const missing = requiredEnv.filter(v => !process.env[v]);
if (missing.length) {
  missing.forEach(v => console.error(`Missing env var ${v}`));
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
  const domains = process.env.DOMAINS!.split(',').map((d) => d.trim()).filter(Boolean);
  for (const d of domains as string[]) {
    const res = await crawl(d);
    await Evaluation.create(res);
    console.log(`${d}: ${res.overallRating}`);
  }
  process.exit();
})();
