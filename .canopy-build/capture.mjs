import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/kaart/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const build = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(build,'web');
const mimes={'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const target=path.resolve(web,'.'+decodeURIComponent(url.pathname));
    if (target!==web && !target.startsWith(web+path.sep)) {res.writeHead(403).end();return;}
    let local=target;
    let bytes;
    try { bytes=await fs.readFile(local); }
    catch {local=path.join(web,'index.html');bytes=await fs.readFile(local);}
    res.writeHead(200,{'Content-Type':mimes[path.extname(local)]||'application/octet-stream'}).end(bytes);
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve=>server.listen(8792,'127.0.0.1',resolve));
let browser;
try {
  const {customers}=await (await fetch('http://127.0.0.1:8000/api/nessie/customer-options')).json();
  const demo=customers.find(c=>/Canopy.*Demo/i.test([c.first_name,c.last_name].join(' ')));
  if(!demo)throw Error('No Canopy demo customer');
  const post=async (endpoint,data)=> {
    const response=await fetch('http://127.0.0.1:8000/api'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!response.ok)throw Error('Sandbox comparison returned '+response.status);
    return response.json();
  };
  const comparison=await post('/simulate',{customer_id:demo.id,horizon_months:12,strategies:[
    {name:'Repair only',shock:{unexpected_expense:2400}},
    {name:'Repair and adjustment',shock:{unexpected_expense:2400},decision:{monthly_spending_reduction:250}}
  ]});
  const [repair,adjusted]=comparison.strategies.map(strategy=>strategy.difference_from_baseline);
  const result={};
  for(const key of Object.keys(adjusted)){if(repair[key]!==null && adjusted[key]!==null && Number.isFinite(Number(adjusted[key]))) result[key]=Number(adjusted[key])-Number(repair[key]);}
  console.log('Verified projection deltas:',JSON.stringify(result));
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu','--no-first-run']});
  const page=await browser.newPage({viewport:{width:418,height:873},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'America/Chicago'});
  await page.addInitScript(()=>localStorage.setItem('canopy.session',JSON.stringify({token:'demo-presentation',user:{id:'demo-user',name:'Jordan',email:'demo@example.test'}})));
  page.on('pageerror',err=>console.error('Page error:',err.message));
  await page.goto('http://127.0.0.1:8792/',{waitUntil:'networkidle',timeout:25000});
  const pick=page.getByText(/Canopy.*Demo/i).first();
  try { await pick.waitFor({timeout:6500}); await pick.click(); } catch {}
  const debug=async(file)=>{await page.screenshot({path:path.join(build,file+'.png'),animations:'disabled'});console.log(file,await page.locator('body').innerText().then(v=>v.slice(0,250).replaceAll('\n',' | ')));};
  await page.getByText(/Your financial weather|Good morning|Good afternoon|Good evening|Net position|Today/i).first().waitFor({timeout:18000});
  await page.waitForTimeout(1600);
  await debug('money');
  const predict=page.getByText('Predict',{exact:true}).last();
  await predict.click({timeout:8000});
  const repairPreset=page.getByText('Car repair',{exact:true}).first();
  await repairPreset.evaluate(e=>{e.scrollIntoView({block:'center'});e.click();});
  await page.waitForTimeout(2400);
  await page.evaluate(()=>document.querySelectorAll('*').forEach(e=>{if(e.scrollHeight>e.clientHeight+300 && e.clientHeight>600 && getComputedStyle(e).overflowY==='auto')e.scrollTop=223;}));
  await debug('repair');
} finally {await browser?.close();server.close();}
