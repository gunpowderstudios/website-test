(function(){
  'use strict';

  const PAGE_KEY='gps-staging-editor:'+location.pathname;
  const EDITABLE_SELECTOR=[
    '.topbar .wrap','.devbar',
    'nav a','main h1','main h2','main h3','main p','main .eyebrow',
    'main .tag','main .link','main .tick','main .quick span',
    'main .fact strong','main .fact span','main .step b','main .step h3','main .step p',
    'main .card .kicker','main .card h3','main .card p','main .card span',
    'main .game-card h3','main .game-card p','main .game-card span',
    'main .btn','footer h3','footer p','footer a','.copyright','.foot div'
  ].join(',');

  const style=document.createElement('style');
  style.textContent=`
    #gpsEditorToggle{position:fixed;left:14px;bottom:14px;z-index:99999;border:0;border-radius:999px;background:#111;color:#fff;padding:10px 14px;font:800 13px/1 system-ui,-apple-system,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.28);cursor:pointer}
    #gpsEditorPanel{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100000;width:min(720px,calc(100% - 24px));display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-radius:16px;background:rgba(20,19,17,.96);color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.34);backdrop-filter:blur(10px);font:700 13px/1.2 system-ui,-apple-system,sans-serif}
    #gpsEditorPanel.open{display:flex}
    #gpsEditorPanel button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:9px 12px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsEditorPanel button:hover{background:#3a3631}
    #gpsEditorPanel .gps-primary{background:#d99c38;color:#21170a;border-color:#d99c38}
    #gpsEditorPanel .gps-danger{background:#6d201b;border-color:#8f3029}
    #gpsEditorPanel .gps-status{margin-left:auto;color:#d8cbb7;font-size:11px;font-weight:650}
    body.gps-editing [data-gps-edit-id]{outline:1px dashed rgba(217,156,56,.6);outline-offset:3px;cursor:text}
    body.gps-editing [data-gps-edit-id]:hover{outline:2px solid #d99c38;background-image:linear-gradient(rgba(217,156,56,.08),rgba(217,156,56,.08))}
    body.gps-editing [data-gps-edit-id]:focus{outline:3px solid #f0b44e;outline-offset:3px;background-image:linear-gradient(rgba(217,156,56,.12),rgba(217,156,56,.12))}
    @media(max-width:600px){#gpsEditorPanel{bottom:8px;gap:6px;padding:8px}#gpsEditorPanel button{padding:9px 10px}.gps-status{width:100%;margin-left:0!important;text-align:center}#gpsEditorToggle{left:10px;bottom:10px}}
  `;
  document.head.appendChild(style);

  const candidates=Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>{
    if(el.closest('#gpsEditorPanel,#gpsEditorToggle'))return false;
    if(el.children.length && !['A','P','H1','H2','H3','SPAN','DIV','STRONG','B'].includes(el.tagName))return false;
    return (el.textContent||'').trim().length>0;
  });

  function pathFor(el){
    const parts=[];
    let node=el;
    while(node&&node!==document.body){
      let part=node.tagName.toLowerCase();
      if(node.id){part+='#'+node.id;parts.unshift(part);break;}
      const cls=Array.from(node.classList).filter(c=>!c.startsWith('gps-')).slice(0,2);
      if(cls.length)part+='.'+cls.join('.');
      if(node.parentElement){
        const same=Array.from(node.parentElement.children).filter(s=>s.tagName===node.tagName);
        if(same.length>1)part+=':nth-of-type('+(same.indexOf(node)+1)+')';
      }
      parts.unshift(part);
      node=node.parentElement;
    }
    return parts.join('>');
  }

  const originals={};
  const elements={};
  candidates.forEach((el,i)=>{
    const id=pathFor(el)||('item-'+i);
    el.dataset.gpsEditId=id;
    originals[id]=el.innerHTML;
    elements[id]=el;
  });

  function readDraft(){
    try{return JSON.parse(localStorage.getItem(PAGE_KEY)||'{}');}catch(e){return {};}
  }
  function applyDraft(){
    const draft=readDraft();
    Object.keys(draft).forEach(id=>{if(elements[id])elements[id].innerHTML=draft[id];});
  }
  applyDraft();

  const toggle=document.createElement('button');
  toggle.id='gpsEditorToggle';
  toggle.type='button';
  toggle.textContent='✎ Edit text';
  toggle.setAttribute('aria-label','Open staging text editor');
  document.body.appendChild(toggle);

  const panel=document.createElement('div');
  panel.id='gpsEditorPanel';
  panel.innerHTML=`
    <button type="button" class="gps-primary" data-action="edit">Start editing</button>
    <button type="button" data-action="save">Save draft</button>
    <button type="button" data-action="copy">Copy changes</button>
    <button type="button" class="gps-danger" data-action="reset">Reset page</button>
    <button type="button" data-action="close">Close</button>
    <span class="gps-status">STAGING editor · browser draft only</span>`;
  document.body.appendChild(panel);

  const editBtn=panel.querySelector('[data-action="edit"]');
  const status=panel.querySelector('.gps-status');
  let editing=false;

  function setStatus(text){status.textContent=text;}
  function setEditing(on){
    editing=on;
    document.body.classList.toggle('gps-editing',on);
    candidates.forEach(el=>{
      if(on){el.setAttribute('contenteditable','true');el.setAttribute('spellcheck','true');}
      else{el.removeAttribute('contenteditable');el.removeAttribute('spellcheck');}
    });
    editBtn.textContent=on?'Stop editing':'Start editing';
    setStatus(on?'Editing is ON · click any outlined text':'STAGING editor · browser draft only');
  }

  function currentChanges(){
    const changes={};
    Object.keys(elements).forEach(id=>{
      if(elements[id].innerHTML!==originals[id])changes[id]=elements[id].innerHTML;
    });
    return changes;
  }

  function saveDraft(){
    const changes=currentChanges();
    localStorage.setItem(PAGE_KEY,JSON.stringify(changes));
    setStatus(Object.keys(changes).length+' change'+(Object.keys(changes).length===1?'':'s')+' saved in this browser');
  }

  async function copyChanges(){
    const changes=currentChanges();
    const payload={page:location.pathname,title:document.title,changes};
    const text=JSON.stringify(payload,null,2);
    try{
      await navigator.clipboard.writeText(text);
      setStatus(Object.keys(changes).length+' change'+(Object.keys(changes).length===1?'':'s')+' copied · paste into ChatGPT');
    }catch(e){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      setStatus('Changes copied · paste into ChatGPT');
    }
  }

  function resetPage(){
    if(!confirm('Reset all text edits saved for this page in this browser?'))return;
    localStorage.removeItem(PAGE_KEY);
    Object.keys(elements).forEach(id=>elements[id].innerHTML=originals[id]);
    setStatus('Draft reset');
  }

  toggle.addEventListener('click',()=>{panel.classList.add('open');toggle.style.display='none';});
  panel.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='edit')setEditing(!editing);
    if(action==='save')saveDraft();
    if(action==='copy')copyChanges();
    if(action==='reset')resetPage();
    if(action==='close'){setEditing(false);panel.classList.remove('open');toggle.style.display='block';}
  });

  let saveTimer=null;
  document.addEventListener('input',e=>{
    if(!editing||!e.target.closest('[data-gps-edit-id]'))return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(saveDraft,700);
  });
})();
