const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const repo=path.resolve(__dirname,'..'),extension=path.join(repo,'extension');
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const context=vm.createContext({window:{}});
for(const [file,globalName,htmlFile,type,count] of [
 ['effects-catalog.js','PixelSquadDefaultEnables','enables.html','enables',465],
 ['handitems-catalog.js','PixelSquadDefaultHanditems','handitems.html','handitems',296]
]){
 vm.runInContext(read('extension/'+file),context,{filename:file});
 const actual=JSON.parse(JSON.stringify(context.window[globalName]));
 const html=read('referencias/html/'+htmlFile);
 const {document}=parseHTML('<html><body>'+html+'</body></html>');
 const source=[...document.querySelectorAll('.effect-item[data-type="'+type+'"]')].map(card=>{
  const image=card.querySelector('.effect-preview-image');
  const name=card.querySelector('.effect-name').cloneNode(true);
  name.querySelector('.effect-id').remove();
  assert.equal(name.textContent.trim(),image.getAttribute('alt').trim());
  return {id:Number(card.dataset.id),name:image.getAttribute('alt'),image:image.getAttribute('src')};
 });
 assert.equal(actual.length,count);assert.equal(source.length,count);
 assert.deepEqual(actual,source);
 assert.equal(new Set(actual.map(x=>x.id)).size,count);
 const imageType=type==='enables'?'effects':'handitems';
 for(const item of actual){
  assert(Number.isSafeInteger(item.id)&&item.id>=0);assert(item.name);
  const image=new URL(item.image);
  assert.equal(image.protocol,'https:');
  assert.equal(image.hostname,'proxy.bananablet.dev');
  assert.equal(image.pathname,'/previews/'+imageType+'/'+item.id+'.png');
 }
 assert(!document.querySelector('script'));
 assert(read('extension/'+file).includes('Pricilao.'));
 console.log('PASS: every '+type+' ID, name and image matches the original HTML ('+count+' items)');
}
const manifest=JSON.parse(read('extension/manifest.json'));
const loader=manifest.content_scripts.find(x=>x.js?.includes('content.js'));
assert(loader.js.indexOf('effects-catalog.js')<loader.js.indexOf('content.js'));
assert(loader.js.indexOf('handitems-catalog.js')<loader.js.indexOf('content.js'));
assert.equal(loader.world,'ISOLATED');
for(const group of manifest.content_scripts)for(const file of [...(group.js||[]),...(group.css||[])]){
 assert(fs.existsSync(path.join(extension,file)),file);
 assert(!file.includes('referencias'));
}
assert(!JSON.stringify(manifest).includes('referencias/html'));
console.log('PASS: manifest loads both catalogs before the UI; HTML references stay outside the extension');
