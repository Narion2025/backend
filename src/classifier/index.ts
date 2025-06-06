import type {Protocol} from 'puppeteer';
const red=/(_ga|_gid|fbp|fr|_gcl|doubleclick|adservice|adsense)/i;
const yellow=/(matomo|mp_|mixpanel|segment|amplitude)/i;
export function classifyCookie(c:Protocol.Network.Cookie){
  if(red.test(c.name)||red.test(c.domain))return{category:'red' as const,purpose:'Tracking/Marketing'};
  if(yellow.test(c.name))return{category:'yellow' as const,purpose:'Analyse/Statistik'};
  return{category:'green' as const,purpose:'Essentiell'};
}
export function mergeRatings(arr:('red'|'yellow'|'green')[]){
  return arr.includes('red')?'red':arr.includes('yellow')?'yellow':'green';
}
