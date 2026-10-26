import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.WORKOUT_TEST_URL??'http://localhost:8095';
const seed=JSON.parse(await fs.readFile('screenshots/qa/test-data.json','utf8'));
const template=seed.sessions[0];seed.sessions=Array.from({length:36},(_,i)=>{const s=structuredClone(template);s.id=`visual-session-${i}`;s.startedAt=Date.now()-(i*2+1)*86400000;s.endedAt=s.startedAt+2400000;s.pausedMs=0;s.exercises[0].sets[0].weight=String(60-Math.floor(i/5)*2.5);s.exercises[0].sets[0].reps=String(8+i%4);return s;});seed.measurements=Array.from({length:12},(_,i)=>({id:`visual-weight-${i}`,date:new Date(Date.now()-i*7*86400000).toISOString().slice(0,10),weightKg:74+i*.25,waistCm:82+i*.2,notes:'Visual QA fixture',bodyFatPercent:20+i*.2}));
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:393,height:873}});await context.addInitScript(data=>{if(!localStorage.getItem('workout.data.v1'))localStorage.setItem('workout.data.v1',JSON.stringify(data));},seed);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const shot=async name=>{await page.waitForTimeout(400);await page.screenshot({path:`screenshots/qa/${name}.png`,fullPage:true});};
try{
 for(const theme of ['Light','Dark','Automatic']){await page.goto(base+'/settings',{waitUntil:'networkidle'});await page.getByRole('button',{name:/Appearance/}).click();await page.getByRole('radio',{name:theme+' appearance',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await page.goto(base+'/progress',{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>localStorage.getItem('workout.palette.v1')),theme==='Automatic'?'system':theme.toLowerCase());await shot(`theme-${theme.toLowerCase()}`);}
 for(const [label,path] of [['History','/history'],['Settings','/settings'],['Today','/'],['Progress','/progress']]){await page.getByRole('tab',{name:label}).click();await page.waitForURL(url=>url.pathname===path);assert.equal(await page.getByRole('tab',{name:label}).getAttribute('aria-selected'),'true');}
 await page.getByRole('button',{name:'Muscles',exact:true}).click();await page.locator('svg path[aria-label^="Mid / lower chest:"]').first().click();await shot('populated-muscles');
 await page.getByRole('button',{name:'Body',exact:true}).click();await shot('populated-body');
 await page.goto(base+'/exercise/'+template.exercises[0].exerciseId,{waitUntil:'networkidle'});await shot('populated-exercise');
 assert.deepEqual(errors,[]);console.log('PASS 36-session charts and light, dark and automatic appearance');
}finally{await browser.close();}
