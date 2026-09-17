(function(){
  'use strict';

  const OWNER='gunpowderstudios';
  const REPO='website-test';
  const BRANCH='main';
  const PROJECT_ROOT='/website-test/';
  const PAGE_KEY='gps-staging-editor:'+location.pathname;
  const TOKEN_KEY='gps-staging-github-token';
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
    #gpsEditorPanel{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100000;width:min(820px,calc(100% - 24px));display:none;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-radius:16px;background:rgba(20,19,17,.96);color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.34);backdrop-filter:blur(10px);font:700 13px/1.2 system-ui,-apple-system,sans-serif}
    #gpsEditorPanel.open{display:flex}
    #gpsEditorPanel button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:9px 12px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsEditorPanel button:hover{background:#3a3631}
    #gpsEditorPanel button:disabled{opacity:.55;cursor:wait}
    #gpsEditorPanel .gps-primary{background:#d99c38;color:#21170a;border-color:#d99c38}
    #gpsEditorPanel .gps-save{background:#376a42;border-color:#4e875a}
    #gpsEditorPanel .gps-danger{background:#6d201b;border-color:#8f3029}
    #gpsEditorPanel .gps-status{margin-left:auto;color:#d8cbb7;font-size:11px;font-weight:650}
    body.gps-editing [data-gps-edit-id]{outline:1px dashed rgba(217,156,56,.6);outline-offset:3px;cursor:text}
    body.gps-editing [data-gps-edit-id]:hover{outline:2px solid #d99c38;background-image:linear-gradient(rgba(217,156,56,.08),rgba(217,156,56,.08))}
    body.gps-editing [data-gps-edit-id]:focus{outline:3px solid #f0b44e;outline-offset:3px;background-image:linear-gradient(rgba(217,156,56,.12),rgba(217,156,56,.12))}
    #gpsTokenOverlay{position:fixed;inset:0;z-index:100001;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.68);font-family:system-ui,-apple-system,sans-serif}
    #gpsTokenOverlay.open{display:grid}
    #gpsTokenCard{width:min(520px,100%);padding:22px;border-radius:18px;background:#191816;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5)}
    #gpsTokenCard h3{margin:0 0 8px;font:800 20px/1.2 system-ui,-apple-system,sans-serif}
    #gpsTokenCard p{margin:0 0 14px;color:#cfc5b6;font:500 13px/1.5 system-ui,-apple-system,sans-serif}
    #gpsTokenCard input{width:100%;padding:12px 13px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#fff;font:500 14px/1 system-ui,-apple-system,sans-serif}
    #gpsTokenCard .gps-token-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
    #gpsTokenCard button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:10px 14px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsTokenCard .gps-token-save{background:#d99c38;color:#21170a;border-color:#d99c38}
    @media(max-width:600px){#gpsEditorPanel{bottom:8px;gap:6px;padding:8px}#gpsEditorPanel button{padding:9px 10px}.gps-status{width:100%;margin-left:0!important;text-align:center}#gpsEditorToggle{left:10px;bottom:10px}}
  `;
  document.head.appendChild(style);

  function editableCandidates(doc){
    return Array.from(doc.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>{
      if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay'))return false;
      if(el.children.length && !['A','P','H1','H2','H3','SPAN','DIV','STRONG','B'].includes(el.tagName))return false;
      return (el.textContent||'').trim().length>0;
    });
  }

  function pathFor(el,bodyRoot){
    const parts=[];
    let node=el;
    while(node&&node!==bodyRoot){
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

  function mapEditable(doc){
    const map={};
    editableCandidates(doc).forEach((el,i)=>{
      const id=pathFor(el,doc.body)||('item-'+i);
      map[id]=el;
    });
    return map;
  }

  const candidates=editableCandidates(document);
  const originals={};
  const elements={};
  candidates.forEach((el,i)=>{
    const id=pathFor(el,document.body)||('item-'+i);
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
    <button type="button" class="gps-save" data-action="save">Save</button>
    <button type="button" data-action="copy">Copy changes</button>
    <button type="button" data-action="forget">Forget token</button>
    <button type="button" class="gps-danger" data-action="reset">Reset page</button>
    <button type="button" data-action="close">Close</button>
    <span class="gps-status">TEST editor · Save commits to GitHub</span>`;
  document.body.appendChild(panel);

  const tokenOverlay=document.createElement('div');
  tokenOverlay.id='gpsTokenOverlay';
  tokenOverlay.innerHTML=`
    <div id="gpsTokenCard" role="dialog" aria-modal="true" aria-labelledby="gpsTokenTitle">
      <h3 id="gpsTokenTitle">Connect the TEST editor to GitHub</h3>
      <p>Paste your fine-grained GitHub token. It is kept only in this browser tab/session and is never written into the website files.</p>
      <input id="gpsTokenInput" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" aria-label="GitHub token">
      <div class="gps-token-actions"><button type="button" data-token-action="cancel">Cancel</button><button type="button" class="gps-token-save" data-token-action="save">Use token</button></div>
    </div>`;
  document.body.appendChild(tokenOverlay);

  const tokenInput=tokenOverlay.querySelector('#gpsTokenInput');
  const editBtn=panel.querySelector('[data-action="edit"]');
  const saveBtn=panel.querySelector('[data-action="save"]');
  const status=panel.querySelector('.gps-status');
  let editing=false;
  let tokenResolver=null;

  function setStatus(text){status.textContent=text;}
  function setEditing(on){
    editing=on;
    document.body.classList.toggle('gps-editing',on);
    candidates.forEach(el=>{
      if(on){el.setAttribute('contenteditable','true');el.setAttribute('spellcheck','true');}
      else{el.removeAttribute('contenteditable');el.removeAttribute('spellcheck');}
    });
    editBtn.textContent=on?'Stop editing':'Start editing';
    setStatus(on?'Editing is ON · Save commits to TEST GitHub':'TEST editor · Save commits to GitHub');
  }

  function currentChanges(){
    const changes={};
    Object.keys(elements).forEach(id=>{
      if(elements[id].innerHTML!==originals[id])changes[id]=elements[id].innerHTML;
    });
    return changes;
  }

  function saveLocalDraft(){
    const changes=currentChanges();
    localStorage.setItem(PAGE_KEY,JSON.stringify(changes));
    return changes;
  }

  function repoPathForPage(){
    let rel=decodeURIComponent(location.pathname);
    if(rel.startsWith(PROJECT_ROOT))rel=rel.slice(PROJECT_ROOT.length);
    else rel=rel.replace(/^\/+/, '');
    if(!rel)rel='index.html';
    else if(rel.endsWith('/'))rel+='index.html';
    else if(!/\.[a-z0-9]+$/i.test(rel))rel+='/index.html';
    return rel;
  }

  function encodeRepoPath(path){return path.split('/').map(encodeURIComponent).join('/');}

  function decodeBase64Utf8(value){
    const binary=atob((value||'').replace(/\n/g,''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(value){
    const bytes=new TextEncoder().encode(value);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk){
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
    }
    return btoa(binary);
  }

  function requestToken(){
    const existing=sessionStorage.getItem(TOKEN_KEY);
    if(existing)return Promise.resolve(existing);
    tokenInput.value='';
    tokenOverlay.classList.add('open');
    setTimeout(()=>tokenInput.focus(),0);
    return new Promise(resolve=>{tokenResolver=resolve;});
  }

  function finishTokenRequest(value){
    tokenOverlay.classList.remove('open');
    if(value){sessionStorage.setItem(TOKEN_KEY,value);}
    const resolve=tokenResolver;
    tokenResolver=null;
    if(resolve)resolve(value||null);
  }

  tokenOverlay.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-token-action]');
    if(!btn)return;
    if(btn.dataset.tokenAction==='cancel')finishTokenRequest(null);
    if(btn.dataset.tokenAction==='save'){
      const token=tokenInput.value.trim();
      if(!token){tokenInput.focus();return;}
      finishTokenRequest(token);
    }
  });
  tokenInput.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const token=tokenInput.value.trim();
      if(token)finishTokenRequest(token);
    }
    if(e.key==='Escape'){e.preventDefault();finishTokenRequest(null);}
  });

  async function githubRequest(url,options,token){
    const headers=Object.assign({
      'Accept':'application/vnd.github+json',
      'Authorization':'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28'
    },(options&&options.headers)||{});
    const response=await fetch(url,Object.assign({},options||{},{headers}));
    if(!response.ok){
      let detail='';
      try{const data=await response.json();detail=data.message||'';}catch(e){}
      const error=new Error(detail||('GitHub returned '+response.status));
      error.status=response.status;
      throw error;
    }
    return response.json();
  }

  async function saveToGitHub(){
    const changes=saveLocalDraft();
    const count=Object.keys(changes).length;
    if(!count){setStatus('No new text changes to save');return;}

    const token=await requestToken();
    if(!token){setStatus('Save cancelled · no token stored');return;}

    const repoPath=repoPathForPage();
    const apiUrl='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(repoPath);
    saveBtn.disabled=true;
    saveBtn.textContent='Saving…';
    setStatus('Saving '+count+' change'+(count===1?'':'s')+' to TEST GitHub…');

    try{
      const file=await githubRequest(apiUrl+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token);
      const source=decodeBase64Utf8(file.content);
      const sourceDoc=new DOMParser().parseFromString(source,'text/html');
      const sourceMap=mapEditable(sourceDoc);
      const missing=[];

      Object.keys(changes).forEach(id=>{
        if(sourceMap[id])sourceMap[id].innerHTML=changes[id];
        else missing.push(id);
      });
      if(missing.length)throw new Error('Could not match '+missing.length+' edited text item'+(missing.length===1?'':'s')+' to the GitHub page. Reload the page and try again.');

      const doctype='<!doctype html>\n';
      const updated=doctype+sourceDoc.documentElement.outerHTML;
      const message='Editor update: '+repoPath.replace(/\/index\.html$/,'').replace(/^index\.html$/,'homepage');

      await githubRequest(apiUrl,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message,content:encodeBase64Utf8(updated),sha:file.sha,branch:BRANCH})
      },token);

      Object.keys(changes).forEach(id=>{if(elements[id])originals[id]=elements[id].innerHTML;});
      setStatus('Saved to GitHub ✓ · TEST Pages will update shortly');
    }catch(error){
      if(error.status===401||error.status===403){
        sessionStorage.removeItem(TOKEN_KEY);
        setStatus('GitHub rejected the token · check Contents: Read and write');
      }else if(error.status===409){
        setStatus('GitHub page changed since loading · reload and try again');
      }else{
        setStatus('Save failed · '+error.message);
      }
      console.error('TEST editor GitHub save failed',error);
    }finally{
      saveBtn.disabled=false;
      saveBtn.textContent='Save';
    }
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
    setStatus('Local page edits reset');
  }

  toggle.addEventListener('click',()=>{panel.classList.add('open');toggle.style.display='none';});
  panel.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='edit')setEditing(!editing);
    if(action==='save')saveToGitHub();
    if(action==='copy')copyChanges();
    if(action==='forget'){
      sessionStorage.removeItem(TOKEN_KEY);
      setStatus('GitHub token forgotten for this browser session');
    }
    if(action==='reset')resetPage();
    if(action==='close'){setEditing(false);panel.classList.remove('open');toggle.style.display='block';}
  });

  let saveTimer=null;
  document.addEventListener('input',e=>{
    if(!editing||!e.target.closest('[data-gps-edit-id]'))return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      const changes=saveLocalDraft();
      setStatus(Object.keys(changes).length+' unsaved change'+(Object.keys(changes).length===1?'':'s')+' · press Save to commit');
    },700);
  });
})();

(function(){const current=document.currentScript;if(!current)return;const helper=document.createElement('script');helper.src=new URL('staging-image-helper.js?v=5',current.src).href;document.head.appendChild(helper);})();
