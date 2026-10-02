(() => {
  if (window.PixelSquadBuilderProjects) return;
  const projects = [
    {id:'platform',name:'Plataforma',icon:'▦',description:'Base plana para pisos e palcos.',words:['plataforma','base','piso','chao'],width:5,length:5,height:1},
    {id:'wall',name:'Parede',icon:'▥',description:'Muro com acabamento no topo.',words:['parede','muro','muralha'],width:6,length:1,height:3},
    {id:'stairs',name:'Escadaria',icon:'◩',description:'Degraus apoiados em colunas de blocos.',words:['escada','escadaria','degrau'],width:3,length:5,height:5},
    {id:'pyramid',name:'Pirâmide',icon:'▲',description:'Camadas menores até o topo.',words:['piramide'],width:7,length:7,height:4},
    {id:'tower',name:'Torre',icon:'▣',description:'Torre quadrada com acabamento superior.',words:['torre','coluna','predio'],width:3,length:3,height:5},
    {id:'castle',name:'Castelo',icon:'♜',description:'Pátio, portão, muralhas e quatro torres.',words:['castelo','forte','fortaleza'],width:7,length:7,height:4},
    {id:'heart',name:'Coração',icon:'♥',description:'Desenho de coração em blocos.',words:['coracao','amor'],width:7,length:7,height:1},
    {id:'stage',name:'Palco',icon:'◫',description:'Palco elevado com acesso por degraus.',words:['palco','show','evento'],width:7,length:5,height:3}
  ];
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function suggest(text) {
    const query=normalize(text), found=projects.map(project=>({project,score:project.words.reduce((score,word)=>new RegExp(`(^|\\W)${word}(?=$|\\W)`).test(query)?Math.max(score,word===normalize(project.name)?100:word.length):score,0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).map(item=>item.project);
    return query.trim() ? found : projects;
  }
  function dimensions(text, project) {
    const query=normalize(text), size=query.match(/\b(\d{1,2})\s*(?:x|×|por)\s*(\d{1,2})\b/);
    const height=query.match(/(?:altura|alto|niveis|andares)\s*(?:de\s*)?(\d{1,2})/) || query.match(/(\d{1,2})\s*(?:de altura|andares|niveis)/);
    return {width:size?Number(size[1]):project.width,length:size?Number(size[2]):project.length,height:height?Number(height[1]):project.height};
  }
  function create(input) {
    const project=projects.find(item=>item.id===input?.project); if(!project) throw Error('Escolha um projeto da biblioteca.');
    const values=Object.fromEntries(['width','length','height'].map(key=>[key,Number(input[key]??project[key])]));
    for(const key of ['width','length']) if(!Number.isInteger(values[key])||values[key]<1||values[key]>16) throw Error('Largura e comprimento precisam estar entre 1 e 16 pisos.');
    if(!Number.isInteger(values.height)||values.height<1||values.height>8) throw Error('A altura precisa estar entre 1 e 8 blocos.');
    const {width:w,length:l,height:h}=values, rotation=Number(input.rotation||0);
    if(!Number.isInteger(rotation)||rotation<0||rotation>3) throw Error('Rotação inválida.');
    const cells=[];
    for(let y=0;y<l;y++) for(let x=0;x<w;x++) {
      let count=h;
      if(project.id==='stairs') count=Math.max(1,Math.ceil((y+1)*h/l));
      if(project.id==='pyramid') count=Math.max(1,Math.min(h,Math.min(x,w-1-x,y,l-1-y)+1));
      if(project.id==='castle') {
        const edge=x===0||y===0||x===w-1||y===l-1, corner=(x===0||x===w-1)&&(y===0||y===l-1);
        count=corner?h:edge?Math.max(1,h-1):1;
        if(y===l-1&&x===Math.floor(w/2)) count=1;
      }
      if(project.id==='stage') count=y===l-1?Math.max(1,h-1):h;
      if(project.id==='heart') {
        const a=(x+.5)/w*2.6-1.3,b=1.3-(y+.5)/l*2.6;
        if(Math.pow(a*a+b*b-1,3)-a*a*b*b*b>0) count=0;
      }
      for(let z=0;z<count;z++) {
        const point=rotation===1?[l-1-y,x]:rotation===2?[w-1-x,l-1-y]:rotation===3?[y,w-1-x]:[x,y];
        cells.push({x:point[0],y:point[1],z,role:z===0?'base':z===count-1?'finish':'body'});
      }
    }
    if(!cells.length) throw Error('Aumente as medidas para formar este projeto.');
    if(cells.length>2048) throw Error('O projeto pode ter até 2048 blocos. Diminua as medidas.');
    cells.sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x);
    return {project:project.id,name:project.name,width:rotation%2?l:w,length:rotation%2?w:l,height:Math.max(...cells.map(c=>c.z))+1,rotation,cells};
  }
  function requirements(plan, materials) {
    const counts=new Map();
    for(const cell of plan.cells) {const id=Number(materials?.[cell.role]); if(!Number.isSafeInteger(id)||id<=0) throw Error('Escolha os mobis para a base, estrutura e acabamento.'); counts.set(id,(counts.get(id)||0)+1);}
    return [...counts].map(([id,quantity])=>({id,quantity}));
  }
  window.PixelSquadBuilderProjects=Object.freeze({projects,normalize,suggest,dimensions,create,requirements});
})();
