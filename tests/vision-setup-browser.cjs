const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const {launchSetup}=await import('../services/vision/setup.mjs');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pixelsquad-setup-ui-'));let app,browser;
 try{
  app=await launchSetup({directory,setupPort:0,apiPort:0});browser=await chromium.launch({headless:true,executablePath:process.env.PIXELSQUAD_TEST_CHROME||'/usr/bin/google-chrome'});const page=await browser.newPage();
  const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto(app.url);assert.equal(await page.locator('[name=key]').getAttribute('type'),'password');
  const key='sk-'+ 'FAKE_BROWSER_TEST_'.repeat(4);await page.locator('[name=key]').fill(key);await page.getByRole('button',{name:'Salvar chave e iniciar'}).click();await page.getByText('Servidor local iniciado.',{exact:false}).waitFor();
  assert(!(await page.content()).includes(key));assert.equal(await page.locator('code').count(),2);assert((await fs.readFile(path.join(directory,'.env'),'utf8')).includes(key));assert(requests.every(url=>new URL(url).origin===new URL(app.url).origin));
  console.log('PASS: Chrome local password form, real Origin/CSRF submission, configuration save, API startup, token handoff and no key in success HTML or external requests');
 }finally{await browser?.close();await app?.close();await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
