import {Schema,model,Document} from 'mongoose';

export interface Cookie{
  name:string;
  domain:string;
  purpose:string;
  expires:Date|null;
  category:'red'|'yellow'|'green';
}
export interface ScriptRef{src:string;tracker:boolean;}
export interface EvaluationDoc extends Document{
  domain:string;
  scanDate:Date;
  overallRating:'red'|'yellow'|'green';
  explanation:string;
  cookies:Cookie[];
  bannerHtml:string|null;
  privacyPolicyUrl:string|null;
  scripts:ScriptRef[];
}
const CookieSchema=new Schema<Cookie>({
  name:String,domain:String,purpose:String,expires:Date,category:{type:String,enum:['red','yellow','green']}
},{_id:false});
const ScriptSchema=new Schema<ScriptRef>({src:String,tracker:Boolean},{_id:false});

const EvaluationSchema=new Schema<EvaluationDoc>({
  domain:{type:String,index:true},
  scanDate:{type:Date,default:Date.now},
  overallRating:{type:String,enum:['red','yellow','green']},
  explanation:String,
  cookies:[CookieSchema],
  bannerHtml:String,
  privacyPolicyUrl:String,
  scripts:[ScriptSchema]
});
export const Evaluation=model<EvaluationDoc>('Evaluation',EvaluationSchema,'cookie_evaluations');
