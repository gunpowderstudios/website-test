(function(){
  'use strict';

  const OWNER='gunpowderstudios';
  const REPO='website-test';
  const BRANCH='main';
  const PROJECT_ROOT='/website-test/';
  const PAGE_KEY='gps-staging-editor:'+location.pathname;
  const LINK_PAGE_KEY=PAGE_KEY+':links';
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
    body.gps-editing [data-gps-link-id].gps-link-selected{outline:3px solid #65a9ff!important;outline-offset:5px!important}
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
    #gpsLinkOverlay{position:fixed;inset:0;z-index:100002;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.68);font-family:system-ui,-apple-system,sans-serif}
    #gpsLinkOverlay.open{display:grid}
    #gpsLinkCard{width:min(560px,100%);padding:22px;border-radius:18px;background:#191816;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5)}
    #gpsLinkCard h3{margin:0 0 8px;font:800 20px/1.2 system-ui,-apple-system,sans-serif}
    #gpsLinkCard p{margin:0 0 14px;color:#cfc5b6;font:500 13px/1.5 system-ui,-apple-system,sans-serif}
    #gpsLinkCard input[type="text"]{width:100%;padding:12px 13px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#fff;font:500 14px/1.2 system-ui,-apple-system,sans-serif}
    #gpsLinkCard .gps-target-row{display:flex;align-items:center;gap:10px;margin-top:14px;padding:11px 12px;border:1px solid #45413b;border-radius:10px;background:#11100f;color:#eee;font:700 13px/1.3 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsLinkCard .gps-target-row input{width:18px;height:18px;margin:0;accent-color:#65a9ff}
    #gpsLinkCard .gps-link-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
    #gpsLinkCard button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:10px 14px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsLinkCard .gps-link-save{background:#65a9ff;color:#101821;border-color:#65a9ff}
    @media(max-width:600px){#gpsEditorPanel{bottom:8px;gap:6px;padding:8px}#gpsEditorPanel button{padding:9px 10px}.gps-status{width:100%;margin-left:0!important;text-align:center}#gpsEditorToggle{left:10px;bottom:10px}}
  `;
  document.head.appendChild(style);

  function editableCandidates(doc){
    return Array.from(doc.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>{
      if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsLinkOverlay'))return false;
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

  function linkCandidates(doc){
    return Array.from(doc.querySelectorAll('a[href]')).filter(el=>!el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsLinkOverlay'));
  }

  function mapLinks(doc){
    const map={};
    linkCandidates(doc).forEach((el,i)=>{
      const id=pathFor(el,doc.body)||('link-'+i);
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

  const linkElements={};
  const originalLinks={};
  const originalTargets={};
  const originalRels={};
  linkCandidates(document).forEach((el,i)=>{
    const id=pathFor(el,document.body)||('link-'+i);
    el.dataset.gpsLinkId=id;
    linkElements[id]=el;
    originalLinks[id]=el.getAttribute('href')||'';
    originalTargets[id]=el.getAttribute('target')||'';
    originalRels[id]=el.getAttribute('rel')||'';
  });

  function readDraft(){
    try{return JSON.parse(localStorage.getItem(PAGE_KEY)||'{}');}catch(e){return {};}
  }
  function applyDraft(){
    const draft=readDraft();
    Object.keys(draft).forEach(id=>{if(elements[id])elements[id].innerHTML=draft[id];});
  }
  function readLinkDraft(){
    try{return JSON.parse(localStorage.getItem(LINK_PAGE_KEY)||'{}');}catch(e){return {};}
  }
  function applyLinkDraft(){
    const draft=readLinkDraft();
    Object.keys(draft).forEach(id=>{
      const el=linkElements[id];
      if(!el)return;
      const item=draft[id];
      if(typeof item==='string'){
        el.setAttribute('href',item);
        return;
      }
      if(!item||typeof item!=='object')return;
      el.setAttribute('href',item.href||'');
      if(item.target)el.setAttribute('target',item.target);else el.removeAttribute('target');
      if(item.rel)el.setAttribute('rel',item.rel);else el.removeAttribute('rel');
    });
  }
  applyDraft();
  applyLinkDraft();

  const toggle=document.createElement('button');
  toggle.id='gpsEditorToggle';
  toggle.type='button';
  toggle.textContent='✎ Edit';
  toggle.setAttribute('aria-label','Open staging editor');
  document.body.appendChild(toggle);

  const panel=document.createElement('div');
  panel.id='gpsEditorPanel';
  panel.innerHTML=`
    <button type="button" class="gps-primary" data-action="edit">Start editing</button>
    <button type="button" data-action="link" disabled>Change link</button>
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

  const linkOverlay=document.createElement('div');
  linkOverlay.id='gpsLinkOverlay';
  linkOverlay.innerHTML=`
    <div id="gpsLinkCard" role="dialog" aria-modal="true" aria-labelledby="gpsLinkTitle">
      <h3 id="gpsLinkTitle">Change link</h3>
      <p>Edit the destination for the selected button, card or link. Relative links such as <strong>shop/</strong> are fine.</p>
      <input id="gpsLinkInput" type="text" autocomplete="off" spellcheck="false" placeholder="https://… or page/" aria-label="Link destination">
      <label class="gps-target-row"><input id="gpsLinkTarget" type="checkbox"> <span>Open in a new window/tab</span></label>
      <div class="gps-link-actions"><button type="button" data-link-action="cancel">Cancel</button><button type="button" class="gps-link-save" data-link-action="save">Apply link</button></div>
    </div>`;
  document.body.appendChild(linkOverlay);

  const tokenInput=tokenOverlay.querySelector('#gpsTokenInput');
  const editBtn=panel.querySelector('[data-action="edit"]');
  const linkBtn=panel.querySelector('[data-action="link"]');
  const saveBtn=panel.querySelector('[data-action="save"]');
  const status=panel.querySelector('.gps-status');
  const linkInput=linkOverlay.querySelector('#gpsLinkInput');
  const linkTarget=linkOverlay.querySelector('#gpsLinkTarget');
  let editing=false;
  let activeLink=null;
  let tokenResolver=null;

  function setStatus(text){status.textContent=text;}
  function selectLink(link){
    if(activeLink)activeLink.classList.remove('gps-link-selected');
    activeLink=link||null;
    if(activeLink)activeLink.classList.add('gps-link-selected');
    linkBtn.disabled=!activeLink;
  }
  function safeHref(value){
    const v=String(value||'').trim();
    if(!v)return false;
    return !/^(?:javascript|data|vbscript):/i.test(v);
  }
  function openLinkEditor(){
    if(!activeLink){setStatus('Click a linked button, card or text first');return;}
    linkInput.value=activeLink.getAttribute('href')||'';
    linkTarget.checked=(activeLink.getAttribute('target')||'')==='_blank';
    linkOverlay.classList.add('open');
    setTimeout(()=>{linkInput.focus();linkInput.select();},0);
  }
  function closeLinkEditor(){linkOverlay.classList.remove('open');}
  function applyLinkEditor(){
    if(!activeLink){closeLinkEditor();return;}
    const value=linkInput.value.trim();
    if(!safeHref(value)){setStatus('That link is empty or not allowed');linkInput.focus();return;}
    activeLink.setAttribute('href',value);
    const relTokens=(activeLink.getAttribute('rel')||'').split(/\s+/).filter(Boolean).filter(x=>x.toLowerCase()!=='noopener');
    if(linkTarget.checked){
      activeLink.setAttribute('target','_blank');
      relTokens.push('noopener');
    }else{
      activeLink.removeAttribute('target');
    }
    if(relTokens.length)activeLink.setAttribute('rel',Array.from(new Set(relTokens)).join(' '));
    else activeLink.removeAttribute('rel');
    saveLocalLinkDraft();
    closeLinkEditor();
    setStatus('Link changed · press Save to commit');
  }
  function setEditing(on){
    editing=on;
    document.body.classList.toggle('gps-editing',on);
    candidates.forEach(el=>{
      if(on){el.setAttribute('contenteditable','true');el.setAttribute('spellcheck','true');}
      else{el.removeAttribute('contenteditable');el.removeAttribute('spellcheck');}
    });
    if(!on)selectLink(null);
    editBtn.textContent=on?'Stop editing':'Start editing';
    setStatus(on?'Editing is ON · click a link then Change link':'TEST editor · Save commits to GitHub');
  }

  // While text editing is active, linked cards/buttons/nav items must stay editable
  // instead of following their href. Normal link behaviour returns when editing stops.
  document.addEventListener('click',e=>{
    if(!editing)return;
    if(e.target.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsLinkOverlay'))return;
    const link=e.target.closest('a[href]');
    if(!link)return;
    e.preventDefault();
    e.stopPropagation();
    selectLink(link);
    setStatus('Link selected · '+(link.getAttribute('href')||'')+' · use Change link to edit URL');
    const editable=e.target.closest('[data-gps-edit-id]');
    if(editable&&editable!==document.activeElement){
      try{editable.focus({preventScroll:true});}catch(err){editable.focus();}
    }
  },true);

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

  function currentLinkChanges(){
    const changes={};
    Object.keys(linkElements).forEach(id=>{
      const el=linkElements[id];
      const href=el.getAttribute('href')||'';
      const target=el.getAttribute('target')||'';
      const rel=el.getAttribute('rel')||'';
      if(href!==originalLinks[id]||target!==originalTargets[id]||rel!==originalRels[id]){
        changes[id]={href,target,rel};
      }
    });
    return changes;
  }

  function saveLocalLinkDraft(){
    const changes=currentLinkChanges();
    localStorage.setItem(LINK_PAGE_KEY,JSON.stringify(changes));
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
    const linkChanges=saveLocalLinkDraft();
    const count=Object.keys(changes).length+Object.keys(linkChanges).length;
    if(!count){setStatus('No new changes to save');return;}

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
      const sourceLinks=mapLinks(sourceDoc);
      const missing=[];

      Object.keys(changes).forEach(id=>{
        if(sourceMap[id])sourceMap[id].innerHTML=changes[id];
        else missing.push(id);
      });
      Object.keys(linkChanges).forEach(id=>{
        const link=sourceLinks[id];
        if(!link){missing.push(id);return;}
        const item=linkChanges[id];
        if(typeof item==='string'){
          link.setAttribute('href',item);
          return;
        }
        link.setAttribute('href',item.href||'');
        if(item.target)link.setAttribute('target',item.target);else link.removeAttribute('target');
        if(item.rel)link.setAttribute('rel',item.rel);else link.removeAttribute('rel');
      });
      if(missing.length)throw new Error('Could not match '+missing.length+' edited item'+(missing.length===1?'':'s')+' to the GitHub page. Reload the page and try again.');

      const doctype='<!doctype html>\n';
      const updated=doctype+sourceDoc.documentElement.outerHTML;
      const message='Editor update: '+repoPath.replace(/\/index\.html$/,'').replace(/^index\.html$/,'homepage');

      await githubRequest(apiUrl,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message,content:encodeBase64Utf8(updated),sha:file.sha,branch:BRANCH})
      },token);

      Object.keys(changes).forEach(id=>{if(elements[id])originals[id]=elements[id].innerHTML;});
      Object.keys(linkChanges).forEach(id=>{
        if(!linkElements[id])return;
        originalLinks[id]=linkElements[id].getAttribute('href')||'';
        originalTargets[id]=linkElements[id].getAttribute('target')||'';
        originalRels[id]=linkElements[id].getAttribute('rel')||'';
      });
      localStorage.removeItem(LINK_PAGE_KEY);
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
    const links=currentLinkChanges();
    const payload={page:location.pathname,title:document.title,changes,links};
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
    localStorage.removeItem(LINK_PAGE_KEY);
    Object.keys(elements).forEach(id=>elements[id].innerHTML=originals[id]);
    Object.keys(linkElements).forEach(id=>{
      const el=linkElements[id];
      el.setAttribute('href',originalLinks[id]);
      if(originalTargets[id])el.setAttribute('target',originalTargets[id]);else el.removeAttribute('target');
      if(originalRels[id])el.setAttribute('rel',originalRels[id]);else el.removeAttribute('rel');
    });
    selectLink(null);
    setStatus('Local page edits reset');
  }

  linkOverlay.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-link-action]');
    if(btn){
      if(btn.dataset.linkAction==='cancel')closeLinkEditor();
      if(btn.dataset.linkAction==='save')applyLinkEditor();
      return;
    }
    if(e.target===linkOverlay)closeLinkEditor();
  });
  linkInput.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();applyLinkEditor();}
    if(e.key==='Escape'){e.preventDefault();closeLinkEditor();}
  });

  toggle.addEventListener('click',()=>{panel.classList.add('open');toggle.style.display='none';});
  panel.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='edit')setEditing(!editing);
    if(action==='link')openLinkEditor();
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
