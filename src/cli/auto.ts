import { crawl } from '../crawler/index.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Evaluation } from '../models/Evaluation.js';

async function run() {
  const list = process.env.DOMAINS?.split(',').map(d => d.trim()).filter(Boolean);
  if (!list || list.length === 0) {
    throw new Error('No domains specified in DOMAINS env variable');
  }

  await mongoose.connect(process.env.MONGO_URI!);
  for (const domain of list) {
    console.log(`Scanning ${domain} ...`);
    const res = await crawl(domain);
    await Evaluation.create(res);
    console.log(`${domain}: ${res.overallRating}`);
  }
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
