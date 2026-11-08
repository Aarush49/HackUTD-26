import {chromium} from 'file:///C:/Users/kaart/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu','--no-first-run']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('https://www.youtube.com/watch?v=YwANe-1W8iU',{waitUntil:'domcontentloaded',timeout:15000});
  await page.locator('video').first().waitFor({timeout:9000});
  await page.waitForFunction(()=>{const v=document.querySelector('video'); return v && Number.isFinite(v.duration) && v.duration>0;},{},{timeout:12000});
  const duration=await page.locator('video').first().evaluate(v=>v.duration);
  console.log('Duration seconds:',duration);
  await page.locator('#movie_player').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'.canopy-build/reference-page.png'});
  for(const [i,frac] of [.12,.26,.46,.66,.82].entries()){
    const video=page.locator('video').first();
    await video.evaluate(async(v,offset)=>{v.muted=true;await v.play().catch(()=>{});v.currentTime=offset;},duration*frac);
    await page.waitForTimeout(2500);
    await page.screenshot({path:'.canopy-build/reference-'+i+'.png'});
    console.log(await video.evaluate(v=>({time:v.currentTime,paused:v.paused,ready:v.readyState,rect:v.getBoundingClientRect().toJSON()})));
  }
}finally{await browser.close();}
