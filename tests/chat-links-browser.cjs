const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PIXELSQUAD_TEST_CHROME||'/usr/bin/google-chrome'});
 try {
  const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body><div id="outside">https://outside.example</div><div class="bubble-container"><div class="chat-content"><b class="username">site.com</b><span class="message"></span></div></div></body>'}));await page.goto('https://www.habblet.city/link-fixture');
  await page.evaluate(()=>{window.PixelSquadGame={active:true};window.opened=[];window.open=(...args)=>opened.push(args);window.nativeClicks=0;document.querySelector('.bubble-container').onclick=()=>++nativeClicks;});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension/chat-links.js'),'utf8')});
  await page.locator('.message').evaluate(el=>el.textContent='Veja https://example.com/a?q=1&x=2#ok, bit.ly/AbC www.example.org/test. (https://example.net/a(b)) user@example.com javascript:example.com');
  await page.waitForFunction(()=>document.querySelectorAll('.message a').length===4);
  assert.equal(await page.locator('#outside a,.username a').count(),0);
  assert.deepEqual(await page.locator('.message a').evaluateAll(links=>links.map(a=>a.href)),['https://example.com/a?q=1&x=2#ok','https://bit.ly/AbC','https://www.example.org/test','https://example.net/a(b)']);
  await page.locator('.message a').nth(1).click();assert.deepEqual(await page.evaluate(()=>opened),[['https://bit.ly/AbC','_blank','noopener,noreferrer']]);assert.equal(await page.evaluate(()=>nativeClicks),0);
  await page.locator('.message').evaluate(el=>el.innerHTML='<a href="https://tinyurl.com/test" onclick="window.nativeClicks++">Link original</a>');await page.locator('.message a').click();assert.equal(await page.evaluate(()=>opened.length),2);assert.equal(await page.evaluate(()=>nativeClicks),0);
  await page.evaluate(()=>{PixelSquadGame.active=false;document.querySelector('.message').textContent='https://example.com';});await page.waitForTimeout(30);assert.equal(await page.locator('.message a').count(),0);
  await page.evaluate(()=>{PixelSquadGame.active=true;dispatchEvent(new Event('pixelsquad-game-change'));});await page.waitForFunction(()=>document.querySelector('.message a'));
  console.log('PASS: one-click normal/shortened chat URLs, punctuation, query/hash, native anchors, no email/script linkification, game-only activation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
