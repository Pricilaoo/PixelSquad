const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const source=file=>fs.readFileSync(path.join(__dirname,'../extension',file),'utf8');
const fixture=fs.readFileSync(path.join(__dirname,'builder-fixture.cjs'),'utf8');
const html='<html><head><style>body{margin:0;background:radial-gradient(ellipse at 40% 30%,#5a6b66,#273c38);font-family:Arial}.nitro-toolbar{position:fixed;bottom:0}#room-floor{position:absolute;left:25px;top:300px;width:140px;height:70px;border:1px solid #91baa8;background:#547c68;color:#fff}iframe{width:100%;height:100vh;border:0}</style></head><body><div class="nitro-toolbar"></div><button id="room-floor">Piso do quarto (5, 5)</button></body></html>';
async function native(frame,options={}) {
  await frame.addScriptTag({content:fixture});await frame.evaluate(options=>{window.builderFixture=window.createNativeBuilderFixture(options);document.querySelector('#room-floor').onclick=()=>builderFixture.clickFloor();},options);
  for(const name of ['builder-projects.js','builder-bridge.js'])await frame.addScriptTag({content:source(name)});
}
async function ui(page,cdp) {
  for(const name of ['content.css','panel-controls.css','builder-panel.css'])await page.addStyleTag({content:source(name)});
  const {frameTree}=await cdp.send('Page.getFrameTree'),{executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'PixelSquadBuilderFixture'});
  const scripts=['game-context.js','locales.js','launcher.js','builder-projects.js','builder-panel.js','content.js'].map(source).join('\n');
  const result=await cdp.send('Runtime.evaluate',{contextId:executionContextId,expression:'window.chrome={runtime:{getURL:()=>"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD/8AAAAASUVORK5CYII=",onMessage:{addListener(){}}},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener(){}}}};\n'+scripts});
  assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return executionContextId;
}
async function open(page) {await page.locator('#pixelsquad-launch').click();await page.locator('#ps-nav [data-tab=build]').click();await page.locator('[data-b=native]').click();await page.locator('#pixelsquad-builder').waitFor();assert.equal(await page.locator('#pixelsquad').count(),0);await page.locator('#pixelsquad-builder [data-id=refresh]').waitFor({state:'visible'});await page.waitForFunction(()=>!!document.querySelector('#pixelsquad-builder tbody'));}
const control=(page,id)=>page.locator(`#pixelsquad-builder [data-id=${id}]`);
async function small(page,width=2,length=2,height=1) {for(const [key,value] of Object.entries({width,length,height}))await control(page,key).fill(String(value));await control(page,'refresh').click();await page.waitForFunction(()=>document.querySelector('#pixelsquad-builder tbody td:nth-child(2)')?.textContent==='4');}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.PIXELSQUAD_TEST_CHROME||'/usr/bin/google-chrome'});
  try {
    const page=await browser.newPage({viewport:{width:1180,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('https://www.habblet.city/builder-fixture');await native(page);
    const cdp=await page.context().newCDPSession(page),contextId=await ui(page,cdp);await open(page);
    await page.locator('.ps-builder-photo summary').click();
    await control(page,'photo-file').setInputFiles({name:'quarto.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD/8AAAAASUVORK5CYII=','base64')});
    await control(page,'photo-preview').waitFor({state:'visible'});assert.match(await control(page,'photo-status').textContent(),/Nenhum item foi identificado ou comprado/);
    assert.equal(await page.evaluate(()=>builderFixture.messages.filter(m=>[3492,1258].includes(m.header)).length),0);
    await control(page,'photo-remove').click();assert(await control(page,'photo-preview').isHidden());
    await control(page,'photo-file').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});
    await page.waitForFunction(()=>document.querySelector('[data-id=photo-status]').textContent.includes('Não foi possível'));
    await page.locator('.ps-builder-photo summary').click();
    assert.equal(await control(page,'auto-buy').isChecked(),false);assert.equal(await page.locator('#pixelsquad-builder [data-project]').count(),8);
    await control(page,'description').fill('castelo 8x8 com altura 4');await control(page,'suggest').click();assert.equal(await control(page,'width').inputValue(),'8');assert.equal(await control(page,'height').inputValue(),'4');assert.match(await control(page,'size').textContent(),/8 × 8 pisos · 4 camadas/);assert.equal(await control(page,'preview').locator('canvas').count(),1);
    const previews='/tmp/pixelsquad-controls';fs.mkdirSync(previews,{recursive:true});await page.locator('#pixelsquad-builder').screenshot({path:path.join(previews,'builder-castle.png')});
    await control(page,'description').fill('nave espacial');await control(page,'suggest').click();assert.match(await control(page,'suggestion').textContent(),/Não há um projeto pronto/);assert.equal(await page.locator('#pixelsquad-builder [data-project]').count(),8);
    await page.locator('#pixelsquad-builder [data-project=platform]').click();await small(page);
    assert.match(await control(page,'cost').textContent(),/6 créditos \+ 3 diamantes/);assert.equal(await page.locator('#pixelsquad-builder [data-buy-id="1"]').inputValue(),'3');
    assert.equal(await page.locator('#pixelsquad-builder td').first().evaluate(el=>getComputedStyle(el).color),'rgb(234, 245, 244)');
    const before=await page.locator('#pixelsquad-builder').boundingBox(),header=await control(page,'header').boundingBox();await page.mouse.move(header.x+150,header.y+24);await page.mouse.down();await page.mouse.move(header.x+190,header.y+45,{steps:5});await page.mouse.up();const after=await page.locator('#pixelsquad-builder').boundingBox();assert(after.x>before.x+20 && after.y>before.y+10);assert(await page.evaluate(()=>!!localStorage.pixelsquad_builder_position));
    await control(page,'minimize').click();assert(await control(page,'preview').isHidden());await control(page,'minimize').click();assert(await control(page,'preview').isVisible());
    await control(page,'build').click();assert.match(await control(page,'status').textContent(),/Selecione primeiro/);assert.equal(await page.evaluate(()=>builderFixture.messages.filter(m=>[3492,1258].includes(m.header)).length),0);
    await control(page,'auto-buy').check();await control(page,'select').click();await control(page,'preview').waitFor({state:'hidden'});await page.locator('#room-floor').click();await control(page,'preview').waitFor();assert.match(await control(page,'origin').textContent(),/Piso \(5, 5\)/);
    await page.locator('#pixelsquad-builder').screenshot({path:path.join(previews,'builder-materials.png')});
    // Editing dimensions invalidates the quote; Build must recalculate without a manual refresh.
    await control(page,'width').fill('3');
    await control(page,'build').click();await page.waitForFunction(()=>document.querySelector('#pixelsquad-builder [data-id=status]')?.textContent.includes('Construção concluída'),null,{timeout:15000});
    const packets=await page.evaluate(()=>builderFixture.messages);assert.deepEqual(packets.filter(m=>m.header===3492).map(m=>m.args),[[8,501,'',5]]);assert.equal(packets.filter(m=>m.header===1258).length,6);assert.match(await control(page,'progress-text').textContent(),/6 blocos colocados/);
    await control(page,'close').click();assert.equal(await page.locator('#pixelsquad-builder').count(),0);await open(page);const restored=await page.locator('#pixelsquad-builder').boundingBox();assert(Math.abs(restored.x-after.x)<2);await small(page);await control(page,'select').click();await control(page,'preview').waitFor({state:'hidden'});await page.keyboard.press('Escape');await control(page,'preview').waitFor();assert.equal(await page.evaluate(()=>Object.hasOwn(builderFixture.handler,'handleRoomObjectEvent')),false);
    await page.setViewportSize({width:380,height:720});await page.waitForTimeout(100);const narrow=await page.locator('#pixelsquad-builder').boundingBox();assert(narrow.x>=0 && narrow.x+narrow.width<=380);const overflow=await page.locator('#pixelsquad-builder .ps-builder-body').evaluate(el=>el.scrollWidth>el.clientWidth);assert.equal(overflow,false);await page.locator('#pixelsquad-builder').screenshot({path:path.join(previews,'builder-mobile.png')});
    await cdp.send('Runtime.evaluate',{contextId,expression:'PixelSquadBuilder.close()'});
    // The top page has no client; only the trusted game frame may receive mutations.
    const embedded=await browser.newPage({viewport:{width:1180,height:1000}});embedded.on('pageerror',error=>errors.push(error.message));await embedded.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));await embedded.goto('https://www.habblet.city/builder-iframe');
    const frameReady=embedded.waitForEvent('framenavigated',{predicate:frame=>frame.url().includes('/room-fixture')});
    await embedded.evaluate(()=>{document.body.innerHTML='<iframe src="https://game.habblet.city/room-fixture"></iframe>';window.topMutations=[];window.addEventListener('message',event=>{if(event.data?.type==='PS_BUILDER_REQUEST'&&['buy','build','select'].includes(event.data.action))topMutations.push(event.data);});});
    const game=await frameReady;await native(game,{stock:10});await game.addScriptTag({content:source('game-context.js')});
    for(const name of ['builder-projects.js','builder-bridge.js'])await embedded.addScriptTag({content:source(name)});
    const nestedCdp=await embedded.context().newCDPSession(embedded);await ui(embedded,nestedCdp);await open(embedded);await small(embedded);
    await control(embedded,'select').click();await control(embedded,'preview').waitFor({state:'hidden'});await game.locator('#room-floor').click();await control(embedded,'preview').waitFor();await control(embedded,'build').click();await game.waitForFunction(()=>builderFixture.objects.length>=1);await control(embedded,'stop').click();await embedded.waitForFunction(()=>document.querySelector('#pixelsquad-builder [data-id=status]')?.textContent.includes('interrompida'));
    assert.equal(await game.evaluate(()=>builderFixture.objects.length),1);assert.deepEqual(await embedded.evaluate(()=>topMutations),[]);
    await embedded.locator('#pixelsquad-builder').screenshot({path:path.join(previews,'builder-cancelled.png')});await control(embedded,'close').click();assert.equal(await game.evaluate(()=>Object.hasOwn(builderFixture.handler,'handleRoomObjectEvent')),false);
    const large=await browser.newPage({viewport:{width:1180,height:1000}});large.on('pageerror',error=>errors.push(error.message));await large.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}));await large.goto('https://www.habblet.city/builder-large-fixture');await native(large,{stock:12000,manyMaterials:4000,publicMetadata:true,emptyOfferIds:true,staleOfferIds:true,hiddenRoot:true});
    const largeCdp=await large.context().newCDPSession(large);await ui(large,largeCdp);await open(large);
    assert.match(await control(large,'sources').textContent(),/12000 mobis/);assert(await control(large,'base').locator('option').count()<=102);
    await control(large,'material-source').selectOption('inventory');assert.match(await control(large,'material-results').textContent(),/1 mobis/);
    await control(large,'catalog-page').selectOption('8');await large.waitForFunction(()=>document.querySelector('#pixelsquad-builder [data-id=status]').textContent.includes('Página da loja vinculada'));
    await control(large,'material-source').selectOption('shop');assert.match(await control(large,'material-results').textContent(),/2 mobis/);
    await control(large,'material-source').selectOption('all');await control(large,'preview').locator('canvas').evaluate(node=>node.dataset.identity='same-preview');
    await control(large,'material-search').fill('Bloco Teste 3999');await large.waitForFunction(()=>[...document.querySelectorAll('#pixelsquad-builder [data-id=base] option')].some(o=>o.value==='3999'));
    assert.equal(await control(large,'preview').locator('canvas').getAttribute('data-identity'),'same-preview');assert(await control(large,'base').locator('option').count()<=3);
    for(const [key,value] of Object.entries({width:16,length:16,height:8}))await control(large,key).fill(String(value));
    assert.match(await control(large,'size').textContent(),/2048 blocos/);assert.equal(await control(large,'preview').locator('*').count(),1,'the largest preview uses a single canvas instead of thousands of SVG nodes');
    await large.locator('#pixelsquad-builder').screenshot({path:path.join(previews,'builder-large-inventory.png')});await control(large,'close').click();
    console.log('PASS: real Chrome, public furniture API, 12000 inventory items, 4002 material types, bounded dropdowns, real catalog page with stale offer IDs, inventory/shop filters, full search and one-node 2048-block preview');
    assert.deepEqual(errors,[]);console.log('PASS: real Chrome with isolated UI / MAIN native bridge, Build entry, descriptions/templates/canvas preview, cost and quantities, opt-in auto-buy, drag/persistence/minimize/close, floor selection/Escape, confirmed automatic construction, narrow layout, single game-frame routing and cancel after one placement');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
