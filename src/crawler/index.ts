import puppeteer,{HTTPResponse,Protocol} from 'puppeteer';
import cheerio from 'cheerio';
import {Cookie} from '../models/Evaluation.js';
import {classifyCookie,mergeRatings} from '../classifier/index.js';

export async function crawl(domain:string){
  const url=domain.startsWith('http')?domain:`https://${domain}`;
  const browser=await puppeteer.launch({headless:'new'});
  const ctx=await browser.createIncognitoBrowserContext();
  const page=await ctx.newPage();
  const setCookies:puppeteer.Protocol.Network.Cookie[]=[];

  page.on('response',async(resp:HTTPResponse)=>{
    const hdr=resp.headers();
    if(hdr['set-cookie']){
      const splitted=hdr['set-cookie'].split(/,(?=[^;]+?=)/);
      for(const raw of splitted){
        const parsed=await ctx.cookies(url);
        setCookies.push(...parsed);
      }
    }
  });

  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  const clientCookies=await page.cookies();
  const allCookies=[...setCookies,...clientCookies];

  const bannerHandle=await page.$('[class*=cookie],[id*=cookie],[class*=consent],[id*=consent]');
  const bannerHtml=bannerHandle?await page.evaluate(el=>el.outerHTML,bannerHandle):null;

  const html=await page.content();
  const $=cheerio.load(html);
  const privLink=$('a[href*="privacy" i],a[href*="datenschutz" i]').first().attr('href')||null;

  const scripts:{src:string;tracker:boolean;}[]=await page.$$eval('script[src]',els=>els.map(e=>({src:(e as HTMLScriptElement).src,tracker:false})));

  await browser.close();

  const cookies:Cookie[]=allCookies.map(c=>{
    const {category,purpose}=classifyCookie(c);
    return{ name:c.name, domain:c.domain||domain, purpose, expires:c.expires?new Date(c.expires*1000):null, category};
  });
  const overallRating=mergeRatings(cookies.map(c=>c.category));
  const explanation=`${overallRating.toUpperCase()} – ${overallRating==='red'?'Tracker':'Analyse/Essentials'}-Cookies entdeckt.`;

  return{domain,url,overallRating,explanation,cookies,bannerHtml,privacyPolicyUrl:privLink,scripts};
}
