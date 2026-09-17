(function(){
  'use strict';

  const OWNER='gunpowderstudios';
  const REPO='website-test';
  const BRANCH='main';
  const PROJECT_ROOT='/website-test/';
  const TOKEN_KEY='gps-staging-github-token';

  const tip=document.createElement('div');
  tip.id='gpsImageNameTip';
  tip.setAttribute('aria-hidden','true');
  tip.style.cssText='position:fixed;z-index:100002;display:none;pointer-events:none;max-width:min(420px,calc(100vw - 24px));padding:8px 11px;border-radius:9px;background:rgba(12,12,11,.95);color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 8px 24px rgba(0,0,0,.32);font:800 12px/1.25 system-ui,-apple-system,sans-serif;letter-spacing:.01em;white-space:normal;overflow-wrap:anywhere';
  document.body.appendChild(tip);

  const style=document.createElement('style');
  style.textContent=`
    body.gps-image-pick{cursor:crosshair!important}
    body.gps-image-pick img{outline:2px dashed rgba(217,156,56,.72);outline-offset:-2px}
    body.gps-image-pick .feature,body.gps-image-pick .game-media,body.gps-image-pick .cta,body.gps-image-pick .hero-image,body.gps-image-pick .hero-image-card,body.gps-image-pick .photo,body.gps-image-pick .gallery-item,body.gps-image-pick .showcase-item,body.gps-image-pick .hero-visual{cursor:crosshair}
    #gpsImagePathOverlay{position:fixed;inset:0;z-index:100005;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.72);font-family:system-ui,-apple-system,sans-serif}
    #gpsImagePathOverlay.open{display:grid}
    #gpsImagePathCard{width:min(590px,100%);padding:22px;border-radius:18px;background:#191816;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5)}
    #gpsImagePathCard h3{margin:0 0 7px;font:800 20px/1.2 system-ui,-apple-system,sans-serif}
    #gpsImagePathCard p{margin:0 0 14px;color:#cfc5b6;font:500 13px/1.5 system-ui,-apple-system,sans-serif}
    #gpsImagePathCard label{display:block;margin:12px 0 6px;color:#eee6db;font:800 12px/1.2 system-ui,-apple-system,sans-serif}
    #gpsImagePathCard input{box-sizing:border-box;width:100%;padding:12px 13px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#fff;font:600 14px/1 system-ui,-apple-system,sans-serif}
    #gpsImagePathCard .gps-hint{margin-top:8px;color:#a99d8d;font-size:11px;line-height:1.45}
    #gpsImagePathCard .gps-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
    #gpsImagePathCard button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:10px 14px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsImagePathCard button:hover{background:#3a3631}
    #gpsImagePathCard button:disabled{opacity:.55;cursor:wait}
    #gpsImagePathCard .gps-save{background:#376a42;border-color:#4e875a}
    #gpsImagePathError{display:none;margin-top:10px;padding:9px 10px;border-radius:9px;background:#5e211d;color:#fff;font:700 12px/1.35 system-ui,-apple-system,sans-serif}
    #gpsImagePathError.show{display:block}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='gpsImagePathOverlay';
  overlay.innerHTML=`
    <div id="gpsImagePathCard" role="dialog" aria-modal="true" aria-labelledby="gpsImagePathTitle">
      <h3 id="gpsImagePathTitle">Change image</h3>
      <p id="gpsImagePathCurrent"></p>
      <label for="gpsImagePathInput">Repository image path</label>
      <input id="gpsImagePathInput" type="text" autocomplete="off" spellcheck="false" placeholder="images/my-new-image.jpg">
      <div class="gps-hint">Upload the image to <b>website-test</b> first, then enter its repo path here — for example <b>images/bag-of-dungeon-heroes-new.jpg</b>. The editor checks that the file exists before changing the page.</div>
      <div id="gpsImagePathError"></div>
      <div class="gps-actions">
        <button type="button" data-image-action="cancel">Cancel</button>
        <button type="button" class="gps-save" data-image-action="save">Use image</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const pathInput=overlay.querySelector('#gpsImagePathInput');
  const currentText=overlay.querySelector('#gpsImagePathCurrent');
  const errorBox=overlay.querySelector('#gpsImagePathError');
  const saveBtn=overlay.querySelector('[data-image-action="save"]');

  let touchTimer=null;
  let changeMode=false;
  let selectedTarget=null;
  let changeBtn=null;
  let statusEl=null;

  function filenameFromUrl(url){
    if(!url||url==='none')return '';
    try{
      const parsed=new URL(String(url).replace(/^url\(["']?/,'').replace(/["']?\)$/,''),location.href);
      return decodeURIComponent(parsed.pathname.split('/').pop()||'');
    }catch(e){return '';}
  }

  function repoPathFromUrl(url){
    if(!url)return '';
    try{
      const parsed=new URL(url,location.href);
      if(parsed.origin!==location.origin)return '';
      let path=decodeURIComponent(parsed.pathname);
      if(path.startsWith(PROJECT_ROOT))path=path.slice(PROJECT_ROOT.length);
      else path=path.replace(/^\/+/, '');
      return path;
    }catch(e){return '';}
  }

  function pageRepoPath(){
    let rel=decodeURIComponent(location.pathname);
    if(rel.startsWith(PROJECT_ROOT))rel=rel.slice(PROJECT_ROOT.length);
    else rel=rel.replace(/^\/+/, '');
    if(!rel)rel='index.html';
    else if(rel.endsWith('/'))rel+='index.html';
    else if(!/\.[a-z0-9]+$/i.test(rel))rel+='/index.html';
    return rel;
  }

  function encodeRepoPath(path){return path.split('/').map(encodeURIComponent).join('/');}

  function firstBackgroundUrl(el){
    const bg=getComputedStyle(el).backgroundImage;
    if(!bg||bg==='none')return '';
    const match=bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match&&match[2]?match[2]:'';
  }

  function pageImages(){
    return Array.from(document.querySelectorAll('img')).filter(img=>!img.closest('#gpsLightbox,#gpsImagePathOverlay,#gpsEditorPanel,#gpsTokenOverlay'));
  }

  function targetFromElement(el){
    if(!el||!el.closest)return null;
    if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageNameTip,#gpsImagePathOverlay,#gpsLightbox'))return null;

    if(el.tagName==='IMG'){
      const url=el.currentSrc||el.getAttribute('src')||'';
      const repoPath=repoPathFromUrl(url);
      if(repoPath){
        const imgs=pageImages();
        return {kind:'img',element:el,url,repoPath,filename:filenameFromUrl(url),imageIndex:imgs.indexOf(el),oldAttr:el.getAttribute('src')||''};
      }
    }

    const visual=el.closest('.image-slot,.slot,.game-media,.feature,.cta,.hero-image,.hero-image-card,.photo,.gallery-item,.showcase-item,.hero-visual');
    if(visual){
      const childImg=visual.querySelector&&visual.querySelector('img');
      if(childImg){
        const url=childImg.currentSrc||childImg.getAttribute('src')||'';
        const repoPath=repoPathFromUrl(url);
        if(repoPath){
          const imgs=pageImages();
          return {kind:'img',element:childImg,url,repoPath,filename:filenameFromUrl(url),imageIndex:imgs.indexOf(childImg),oldAttr:childImg.getAttribute('src')||''};
        }
      }
    }

    let node=el;
    while(node&&node!==document.body){
      const url=firstBackgroundUrl(node);
      if(url){
        const repoPath=repoPathFromUrl(url);
        if(repoPath)return {kind:'background',element:node,url,repoPath,filename:filenameFromUrl(url)};
      }
      node=node.parentElement;
    }
    return null;
  }

  function hideTip(){tip.style.display='none';tip.setAttribute('aria-hidden','true');}

  function showTip(name,x,y){
    if(!name){hideTip();return;}
    tip.textContent='Image: '+name;
    tip.style.display='block';
    tip.setAttribute('aria-hidden','false');
    const pad=14;
    const r=tip.getBoundingClientRect();
    let left=x+16, top=y+16;
    if(left+r.width>window.innerWidth-pad)left=Math.max(pad,x-r.width-16);
    if(top+r.height>window.innerHeight-pad)top=Math.max(pad,y-r.height-16);
    tip.style.left=left+'px';tip.style.top=top+'px';
  }

  function setStatus(text){if(statusEl)statusEl.textContent=text;}

  function setChangeMode(on){
    changeMode=on;
    document.body.classList.toggle('gps-image-pick',on);
    if(changeBtn)changeBtn.textContent=on?'Cancel image change':'Change image';
    setStatus(on?'Click the image or image panel you want to change':'TEST editor · Save commits to GitHub');
  }

  function showModal(target){
    selectedTarget=target;
    currentText.textContent='Current repo image: '+target.repoPath;
    pathInput.value=target.repoPath;
    errorBox.textContent='';errorBox.classList.remove('show');
    overlay.classList.add('open');
    setTimeout(()=>{pathInput.focus();pathInput.select();},0);
  }

  function closeModal(){
    overlay.classList.remove('open');
    errorBox.textContent='';errorBox.classList.remove('show');
    selectedTarget=null;
  }

  function modalError(text){errorBox.textContent=text;errorBox.classList.add('show');}

  function tokenForChange(){
    let token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(token)return token;
    token=(window.prompt('Paste your fine-grained GitHub token for website-test. It will only be kept for this browser session.')||'').trim();
    if(token)sessionStorage.setItem(TOKEN_KEY,token);
    return token;
  }

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
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
    return btoa(binary);
  }

  async function githubJson(url,options,token,allow404){
    const response=await fetch(url,Object.assign({},options||{}, {headers:Object.assign({
      'Accept':'application/vnd.github+json',
      'Authorization':'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28'
    },(options&&options.headers)||{})}));
    if(allow404&&response.status===404)return null;
    if(!response.ok){
      let detail='';
      try{detail=(await response.json()).message||'';}catch(e){}
      const error=new Error(detail||('GitHub returned '+response.status));
      error.status=response.status;
      throw error;
    }
    return response.json();
  }

  function normaliseRepoPath(raw){
    let path=(raw||'').trim();
    try{
      if(/^https?:\/\//i.test(path)){
        const u=new URL(path);
        path=decodeURIComponent(u.pathname);
        const marker='/'+REPO+'/';
        if(path.includes(marker))path=path.split(marker).pop();
      }
    }catch(e){}
    path=path.replace(/^\/+/, '');
    if(path.startsWith(REPO+'/'))path=path.slice(REPO.length+1);
    if(path.startsWith('website-test/'))path=path.slice('website-test/'.length);
    if(path.includes('..'))throw new Error('Do not use “..” in the repo path.');
    if(!/^[-A-Za-z0-9_ .\/]+\.(jpe?g|png)$/i.test(path))throw new Error('Enter a JPG or PNG path such as images/my-image.jpg.');
    return path;
  }

  function relativeReference(pagePath,targetPath){
    const from=pagePath.split('/');from.pop();
    const to=targetPath.split('/');
    let i=0;
    while(i<from.length&&i<to.length&&from[i]===to[i])i++;
    return '../'.repeat(from.length-i)+to.slice(i).join('/');
  }

  function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

  function updateSourceReference(source,target,newRelative){
    if(target.kind==='img'){
      const doc=new DOMParser().parseFromString(source,'text/html');
      const imgs=Array.from(doc.querySelectorAll('img'));
      const img=imgs[target.imageIndex];
      if(!img)throw new Error('Could not match that image in the page. Reload and try again.');
      const old=img.getAttribute('src')||'';
      img.setAttribute('src',newRelative);
      const oldTag=img.outerHTML.replace('src="'+newRelative.replace(/&/g,'&amp;')+'"','src="'+old+'"');
      const newTag=img.outerHTML;
      if(source.includes(oldTag))return source.replace(oldTag,newTag);

      const oldEsc=escapeRegExp(old);
      const srcRe=new RegExp('(\\bsrc\\s*=\\s*["\'])'+oldEsc+'(["\'])');
      if(srcRe.test(source))return source.replace(srcRe,'$1'+newRelative+'$2');
      throw new Error('Could not find the current image reference in the page. Reload and try again.');
    }

    const oldFilename=escapeRegExp(target.filename);
    const refRe=new RegExp('(?:\\.\\.\\/|\\.\\/|[A-Za-z0-9_. -]+\\/)*[A-Za-z0-9_. -]*'+oldFilename);
    if(!refRe.test(source))throw new Error('Could not find the background image reference in the page.');
    return source.replace(refRe,newRelative);
  }

  function previewTarget(target,newRepoPath){
    const liveUrl=location.origin+PROJECT_ROOT+newRepoPath+'?v='+Date.now();
    if(target.kind==='img'){
      target.element.onerror=null;
      target.element.src=liveUrl;
    }else{
      target.element.style.backgroundImage='url("'+liveUrl+'")';
    }
  }

  async function savePathChange(){
    if(!selectedTarget)return;
    const target=selectedTarget;
    let newRepoPath;
    try{newRepoPath=normaliseRepoPath(pathInput.value);}catch(error){modalError(error.message);return;}
    if(newRepoPath===target.repoPath){modalError('That is already the current image path.');return;}

    const token=tokenForChange();
    if(!token){modalError('No GitHub token is available for this browser session.');return;}

    saveBtn.disabled=true;saveBtn.textContent='Checking…';
    errorBox.classList.remove('show');
    try{
      const imageApi='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(newRepoPath);
      const exists=await githubJson(imageApi+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,true);
      if(!exists||exists.type==='dir')throw new Error('That image was not found in website-test. Upload it to the repo first, then try again.');

      const pagePath=pageRepoPath();
      const pageApi='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(pagePath);
      const page=await githubJson(pageApi+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,false);
      const source=decodeBase64Utf8(page.content);
      const newRelative=relativeReference(pagePath,newRepoPath);
      const updated=updateSourceReference(source,target,newRelative);

      saveBtn.textContent='Saving…';
      await githubJson(pageApi,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:'Editor image path: '+target.repoPath+' → '+newRepoPath,
          content:encodeBase64Utf8(updated),
          sha:page.sha,
          branch:BRANCH
        })
      },token,false);

      previewTarget(target,newRepoPath);
      closeModal();
      setChangeMode(false);
      setStatus('Image path saved to TEST GitHub ✓ · '+newRepoPath);
    }catch(error){
      if(error.status===401||error.status===403){
        sessionStorage.removeItem(TOKEN_KEY);
        modalError('GitHub rejected the token · check Contents: Read and write.');
      }else if(error.status===409){
        modalError('The page changed in GitHub. Reload this page and try again.');
      }else modalError(error.message);
      console.error('TEST image path change failed',error);
    }finally{
      saveBtn.disabled=false;saveBtn.textContent='Use image';
    }
  }

  function installEditorButton(){
    const panel=document.querySelector('#gpsEditorPanel');
    if(!panel)return false;
    statusEl=panel.querySelector('.gps-status');
    const old=panel.querySelector('[data-action="replace-image"]');
    if(old)old.remove();
    const existing=panel.querySelector('[data-action="change-image"]');
    if(existing){changeBtn=existing;return true;}
    changeBtn=document.createElement('button');
    changeBtn.type='button';
    changeBtn.dataset.action='change-image';
    changeBtn.textContent='Change image';
    const before=panel.querySelector('[data-action="forget"]')||statusEl;
    panel.insertBefore(changeBtn,before||null);
    changeBtn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setChangeMode(!changeMode);});
    return true;
  }

  if(!installEditorButton()){
    let tries=0;
    const timer=setInterval(function(){tries++;if(installEditorButton()||tries>30)clearInterval(timer);},200);
  }

  document.addEventListener('mousemove',function(e){
    const target=targetFromElement(e.target);
    if(!target){hideTip();return;}
    showTip(target.repoPath,e.clientX,e.clientY);
  },{passive:true});

  document.addEventListener('mouseleave',hideTip);

  document.addEventListener('touchstart',function(e){
    const target=targetFromElement(e.target);
    if(!target)return;
    const t=e.touches&&e.touches[0];if(!t)return;
    showTip(target.repoPath,t.clientX,t.clientY);
    clearTimeout(touchTimer);touchTimer=setTimeout(hideTip,2200);
  },{passive:true});

  document.addEventListener('click',function(e){
    if(!changeMode)return;
    if(e.target.closest&&e.target.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImagePathOverlay'))return;
    const target=targetFromElement(e.target);
    if(!target){setStatus('No local TEST image found there · click another image');return;}
    e.preventDefault();e.stopPropagation();showModal(target);
  },true);

  overlay.addEventListener('click',function(e){
    const btn=e.target.closest('button[data-image-action]');
    if(btn){
      if(btn.dataset.imageAction==='cancel')closeModal();
      if(btn.dataset.imageAction==='save')savePathChange();
      return;
    }
    if(e.target===overlay)closeModal();
  });

  pathInput.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();savePathChange();}
    if(e.key==='Escape'){e.preventDefault();closeModal();}
  });
})();
