import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {firebaseFixture} from './firebase-fixture.mjs';
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';if(p.includes('..'))throw Error();const b=await readFile('.'+p);res.writeHead(200,{'Content-Type':({html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript'})[p.split('.').pop()]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4182,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const fixture=firebaseFixture();fixture.documents.set('test-reader',{chemistryV1:{records:{sentinel:true}},data:{sentinel:1}});
 const ca=await browser.newContext(),cb=await browser.newContext({viewport:{width:390,height:844}});
 const a=await ca.newPage(),b=await cb.newPage(),errors=[];
 for(const p of[a,b]){p.on('pageerror',e=>errors.push(e.message));await fixture.install(p);await p.goto('http://127.0.0.1:4182');await p.locator('#sign-in').click();await p.waitForFunction(()=>document.querySelector('#sync-status').textContent.includes('已同步'));}
 await a.locator('#lesson-done').check();await b.waitForFunction(()=>document.querySelector('#lesson-done').checked);
 await b.locator('[data-question="1-1:0"] button').first().click();await a.waitForFunction(()=>document.querySelector('[data-question="1-1:0"] button').getAttribute('aria-pressed')==='true');
 await cb.setOffline(true);await b.locator('#lesson-done').uncheck();await cb.setOffline(false);await b.locator('#sync-now').click();await a.waitForFunction(()=>!document.querySelector('#lesson-done').checked);
 await b.reload();await b.waitForFunction(()=>document.querySelector('#sync-status').textContent.includes('已同步'));assert.equal(await b.locator('[data-question="1-1:0"] button').first().getAttribute('aria-pressed'),'true');
 let count=0;for(let i=0;i<10;i++){await b.locator('#nav button').nth(i).click();count+=await b.locator('[data-question]').count();assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
 assert.equal(count,30);assert.deepEqual(fixture.documents.get('test-reader').chemistryV1,{records:{sentinel:true}});assert.deepEqual(fixture.documents.get('test-reader').data,{sentinel:1});assert.ok(fixture.documents.get('test-reader').physicsWavesV1);
 await b.locator('#sign-out').click();await b.waitForFunction(()=>!document.querySelector('#sign-in').hidden);assert.deepEqual(errors,[]);
 console.log('PASS: 10 lessons, 30 quizzes, mobile layout, Google adapter, two-device sync, offline retry, reload, logout, chemistry field isolation.');
}finally{await browser.close();server.close();}
