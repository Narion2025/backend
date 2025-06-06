import {Router} from 'express';
import {Evaluation} from '../models/Evaluation.js';
import {crawl} from '../crawler/index.js';

export const router=Router();

router.get('/evaluations/:domain',async(req,res)=>{
  const doc=await Evaluation.findOne({domain:req.params.domain}).sort({scanDate:-1});
  if(!doc)return res.status(404).json({msg:'not found'});
  res.json(doc);
});

router.post('/evaluations/scan',async(req,res)=>{
  const {domain}=req.body;
  if(!domain)return res.status(400).json({msg:'domain required'});
  const data=await crawl(domain);
  const saved=await Evaluation.create(data);
  res.json(saved);
});
