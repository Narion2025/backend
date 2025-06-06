import {crawl} from '../crawler/index.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import {Evaluation} from '../models/Evaluation.js';

(async()=>{
  await mongoose.connect(process.env.MONGO_URI!);
  const domains=process.argv.slice(2);
  if(!domains.length)throw new Error('Usage: pnpm scan domain1.com domain2.com');
  for(const d of domains){
    const res=await crawl(d);
    await Evaluation.create(res);
    console.log(`${d}: ${res.overallRating}`);
  }
  process.exit();
})();
