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

  const helperStyle=document.createElement('style');
  helperStyle.textContent=`
    body.gps-image-pick{cursor:crosshair!important}
    body.gps-image-pick img{outline:2px dashed rgba(217,156,56,.72);outline-offset:-2px}
    body.gps-image-pick .feature,body.gps-image-pick .game-media,body.gps-image-pick .cta,body.gps-image-pick .hero-image,body.gps-image-pick .hero-image-card,body.gps-image-pick .photo,body.gps-image-pick .gallery-item,body.gps-image-pick .showcase-item,body.gps-image-pick .hero-visual{cursor:crosshair}
    #gpsImageEditOverlay{position:fixed;inset:0;z-index:100005;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.72);font-family:system-ui,-apple-system,sans-serif}
    #gpsImageEditOverlay.open{display:grid}
    #gpsImageEditCard{width:min(560px,100%);padding:22px;border-radius:18px;background:#191816;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5)}
    #gpsImageEditCard h3{margin:0 0 7px;font:800 20px/1.2 system-ui,-apple-system,sans-serif}
    #gpsImageEditCard p{margin:0 0 14px;color:#cfc5b6;font:500 13px/1.5 system-ui,-apple-system,sans-serif}
    #gpsImageEditCard label{display:block;margin:12px 0 6px;color:#eee6db;font:800 12px/1.2 system-ui,-apple-system,sans-serif}
    #gpsImageEditCard input[type="text"]{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#fff;font:600 14px/1 system-ui,-apple-system,sans-serif}
    #gpsImageEditCard input[type="file"]{box-sizing:border-box;width:100%;padding:10px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#d9d0c4;font:600 12px/1.2 system-ui,-apple-system,sans-serif}
    #gpsImageEditCard .gps-image-hint{margin-top:8px;color:#a99d8d;font-size:11px}
    #gpsImageEditCard .gps-image-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
    #gpsImageEditCard button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:10px 14px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsImageEditCard button:hover{background:#3a3631}
    #gpsImageEditCard button:disabled{opacity:.55;cursor:wait}
    #gpsImageEditCard .gps-image-save{background:#376a42;border-color:#4e875a}
    #gpsImageEditError{display:none;margin-top:10px;padding:9px 10px;border-radius:9px;background:#5e211d;color:#fff;font:700 12px/1.35 system-ui,-apple-system,sans-serif}
    #gpsImageEditError.show{display:block}
  `;
  document.head.appendChild(helperStyle);

  const overlay=document.createElement('div');
  overlay.id='gpsImageEditOverlay';
  overlay.innerHTML=`
    <div id="gpsImageEditCard" role="dialog" aria-modal="true" aria-labelledby="gpsImageEditTitle">
      <h3 id="gpsImageEditTitle">Change image</h3>
      <p id="gpsImageEditCurrent"></p>
      <label for="gpsImageEditName">Filename</label>
      <input id="gpsImageEditName" type="text" autocomplete="off" spellcheck="false">
      <label for="gpsImageEditFile">New image <span style="font-weight:500;color:#a99d8d">(optional)</span></label>
      <input id="gpsImageEditFile" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png">
      <div class="gps-image-hint">Keep the filename to overwrite. Change it to create a new image and update this page. With no new file selected, changing the name copies the existing image.</div>
      <div id="gpsImageEditError"></div>
      <div class="gps-image-actions">
        <button type="button" data-image-action="cancel">Cancel</button>
        <button type="button" class="gps-image-save" data-image-action="save">Save image</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const nameInput=overlay.querySelector('#gpsImageEditName');
  const fileInput=overlay.querySelector('#gpsImageEditFile');
  const currentText=overlay.querySelector('#gpsImageEditCurrent');
  const errorBox=overlay.querySelector('#gpsImageEditError');
  const modalSaveBtn=overlay.querySelector('[data-image-action="save"]');

  let touchTimer=null;
  let replaceMode=false;
  let selectedTarget=null;
  let replaceBtn=null;
  let statusEl=null;

  function filenameFromUrl(url){
    if(!url||url==='none')return '';
    try{
      const clean=String(url).replace(/^url\(["']?/,'').replace(/["']?\)$/,'');
      const parsed=new URL(clean,location.href);
      return decodeURIComponent(parsed.pathname.split('/').pop()||'');
    }catch(e){
      const clean=String(url).replace(/^url\(["']?/,'').replace(/["']?\)$/,'').split('?')[0].split('#')[0];
      return decodeURIComponent(clean.split('/').pop()||'');
    }
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

  function encodeRepoPath(path){
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function firstBackgroundUrl(el){
    const bg=getComputedStyle(el).backgroundImage;
    if(!bg||bg==='none')return '';
    const match=bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match&&match[2]?match[2]:'';
  }

  function targetFromElement(el){
    if(!el||!el.closest)return null;
    if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageNameTip,#gpsImageEditOverlay,#gpsLightbox'))return null;

    if(el.tagName==='IMG'){
      const url=el.currentSrc||el.getAttribute('src')||'';
      const repoPath=repoPathFromUrl(url);
      if(repoPath)return {kind:'img',element:el,url,repoPath,filename:filenameFromUrl(url)};
    }

    const visual=el.closest('.image-slot,.slot,.game-media,.feature,.cta,.hero-image,.hero-image-card,.photo,.gallery-item,.showcase-item,.hero-visual');
    if(visual){
      const childImg=visual.querySelector&&visual.querySelector('img');
      if(childImg){
        const url=childImg.currentSrc||childImg.getAttribute('src')||'';
        const repoPath=repoPathFromUrl(url);
        if(repoPath)return {kind:'img',element:childImg,url,repoPath,filename:filenameFromUrl(url)};
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

  function imageNameFor(el){
    const target=targetFromElement(el);
    return target?target.filename:'';
  }

  function hideTip(){
    tip.style.display='none';
    tip.setAttribute('aria-hidden','true');
  }

  function showTip(name,x,y){
    if(!name){hideTip();return;}
    tip.textContent='Image: '+name;
    tip.style.display='block';
    tip.setAttribute('aria-hidden','false');
    const pad=14;
    const r=tip.getBoundingClientRect();
    let left=x+16;
    let top=y+16;
    if(left+r.width>window.innerWidth-pad)left=Math.max(pad,x-r.width-16);
    if(top+r.height>window.innerHeight-pad)top=Math.max(pad,y-r.height-16);
    tip.style.left=left+'px';
    tip.style.top=top+'px';
  }

  function setStatus(text){if(statusEl)statusEl.textContent=text;}

  function setReplaceMode(on){
    replaceMode=on;
    document.body.classList.toggle('gps-image-pick',on);
    if(replaceBtn)replaceBtn.textContent=on?'Cancel image replace':'Replace image';
    setStatus(on?'Click the image or image panel you want to change':'TEST editor · Save commits to GitHub');
  }

  function showModal(target){
    selectedTarget=target;
    currentText.textContent='Current image: '+target.filename;
    nameInput.value=target.filename;
    fileInput.value='';
    errorBox.textContent='';
    errorBox.classList.remove('show');
    overlay.classList.add('open');
    setTimeout(()=>nameInput.focus(),0);
  }

  function closeModal(){
    overlay.classList.remove('open');
    errorBox.textContent='';
    errorBox.classList.remove('show');
    fileInput.value='';
    selectedTarget=null;
  }

  function modalError(text){
    errorBox.textContent=text;
    errorBox.classList.add('show');
  }

  function tokenForUpload(){
    let token=sessionStorage.getItem(TOKEN_KEY)||'';
    if(token)return token;
    token=window.prompt('Paste your fine-grained GitHub token for website-test. It will only be kept for this browser session.')||'';
    token=token.trim();
    if(token)sessionStorage.setItem(TOKEN_KEY,token);
    return token;
  }

  function bytesToBase64(buffer){
    const bytes=new Uint8Array(buffer);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk){binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));}
    return btoa(binary);
  }

  function decodeBase64Utf8(value){
    const binary=atob((value||'').replace(/\n/g,''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(value){
    return bytesToBase64(new TextEncoder().encode(value).buffer);
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

  function normaliseFilename(raw,file,originalFilename){
    let name=(raw||'').trim();
    if(!name)name=originalFilename;
    if(name.includes('/')||name.includes('\\')||name.includes('..'))throw new Error('Use a filename only, without folders or “..”.');
    if(!/\.(jpe?g|png)$/i.test(name)){
      if(file&&file.type==='image/png')name+='.png';
      else if(file&&file.type==='image/jpeg')name+='.jpg';
      else{
        const oldExt=(originalFilename.match(/\.(jpe?g|png)$/i)||[])[0]||'.jpg';
        name+=oldExt;
      }
    }
    if(!/^[A-Za-z0-9._ -]+\.(jpe?g|png)$/i.test(name))throw new Error('Use letters, numbers, spaces, hyphens or underscores in the filename.');
    return name;
  }

  function typeMatchesFilename(file,filename){
    if(!file)return true;
    if(/\.png$/i.test(filename))return file.type==='image/png';
    return file.type==='image/jpeg';
  }

  async function updatePageReference(token,oldFilename,newFilename){
    if(oldFilename===newFilename)return;
    const pagePath=pageRepoPath();
    const pageApi='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(pagePath);
    const page=await githubJson(pageApi+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,false);
    const source=decodeBase64Utf8(page.content);
    if(!source.includes(oldFilename))throw new Error('Could not find '+oldFilename+' in this page. Reload and try again.');
    const updated=source.split(oldFilename).join(newFilename);
    await githubJson(pageApi,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:'Editor image reference: '+oldFilename+' → '+newFilename,
        content:encodeBase64Utf8(updated),
        sha:page.sha,
        branch:BRANCH
      })
    },token,false);
  }

  function previewTarget(target,file,newRepoPath){
    if(file){
      const preview=URL.createObjectURL(file);
      if(target.kind==='img'){
        target.element.onerror=null;
        target.element.src=preview;
      }else{
        target.element.style.backgroundImage='url("'+preview+'")';
      }
      return;
    }
    const liveUrl=location.origin+PROJECT_ROOT+newRepoPath+'?v='+Date.now();
    if(target.kind==='img'){
      target.element.onerror=null;
      target.element.src=liveUrl;
    }else{
      target.element.style.backgroundImage='url("'+liveUrl+'")';
    }
  }

  async function saveImageChange(){
    if(!selectedTarget)return;
    const target=selectedTarget;
    const file=fileInput.files&&fileInput.files[0]||null;
    let newFilename;
    try{
      newFilename=normaliseFilename(nameInput.value,file,target.filename);
    }catch(error){
      modalError(error.message);
      return;
    }

    if(!typeMatchesFilename(file,newFilename)){
      modalError('The file type must match the filename extension ('+(/\.png$/i.test(newFilename)?'PNG':'JPG')+').');
      return;
    }

    if(!file&&newFilename===target.filename){
      modalError('Choose a new image, change the filename, or both.');
      return;
    }

    const token=tokenForUpload();
    if(!token){modalError('Image change cancelled · no GitHub token.');return;}

    const oldPath=target.repoPath;
    const folder=oldPath.includes('/')?oldPath.slice(0,oldPath.lastIndexOf('/')+1):'';
    const newPath=folder+newFilename;
    const oldApi='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(oldPath);
    const newApi='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodeRepoPath(newPath);

    modalSaveBtn.disabled=true;
    modalSaveBtn.textContent='Saving…';
    if(replaceBtn)replaceBtn.disabled=true;
    setStatus('Saving image change to TEST GitHub…');
    errorBox.classList.remove('show');

    try{
      const oldFile=await githubJson(oldApi+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,true);
      let content;

      if(file){
        content=bytesToBase64(await file.arrayBuffer());
      }else{
        if(!oldFile||!oldFile.content)throw new Error('The existing image is not in GitHub yet. Choose an image file to upload.');
        content=(oldFile.content||'').replace(/\n/g,'');
      }

      const destination=oldPath===newPath?oldFile:await githubJson(newApi+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,true);
      if(oldPath!==newPath&&destination){
        const okay=window.confirm(newFilename+' already exists in TEST. Replace that file?');
        if(!okay)throw new Error('Save cancelled.');
      }

      const imageBody={
        message:(oldPath===newPath?'Editor image update: ':'Editor image upload: ')+newPath,
        content,
        branch:BRANCH
      };
      if(destination&&destination.sha)imageBody.sha=destination.sha;

      await githubJson(newApi,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(imageBody)
      },token,false);

      if(oldPath!==newPath){
        await updatePageReference(token,target.filename,newFilename);
      }

      previewTarget(target,file,newPath);
      target.repoPath=newPath;
      target.filename=newFilename;
      setStatus((oldPath===newPath?'Image overwritten':'New image saved and page updated')+' ✓ · TEST Pages will update shortly');
      closeModal();
      setReplaceMode(false);
    }catch(error){
      if(error.status===401||error.status===403){
        sessionStorage.removeItem(TOKEN_KEY);
        modalError('GitHub rejected the token · check Contents: Read and write.');
        setStatus('GitHub rejected the token · check Contents: Read and write');
      }else if(error.status===409){
        modalError('GitHub changed while saving. Reload and try again.');
        setStatus('GitHub changed while saving · reload and try again');
      }else{
        modalError(error.message);
        setStatus('Image change failed · '+error.message);
      }
      console.error('TEST image change failed',error);
    }finally{
      modalSaveBtn.disabled=false;
      modalSaveBtn.textContent='Save image';
      if(replaceBtn)replaceBtn.disabled=false;
    }
  }

  function installEditorButton(){
    const panel=document.querySelector('#gpsEditorPanel');
    if(!panel)return false;
    if(panel.querySelector('[data-action="replace-image"]'))return true;
    statusEl=panel.querySelector('.gps-status');
    replaceBtn=document.createElement('button');
    replaceBtn.type='button';
    replaceBtn.dataset.action='replace-image';
    replaceBtn.textContent='Replace image';
    const before=panel.querySelector('[data-action="forget"]')||statusEl;
    panel.insertBefore(replaceBtn,before||null);
    replaceBtn.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      setReplaceMode(!replaceMode);
    });
    return true;
  }

  if(!installEditorButton()){
    let tries=0;
    const timer=setInterval(function(){tries++;if(installEditorButton()||tries>30)clearInterval(timer);},200);
  }

  document.addEventListener('mousemove',function(e){
    const name=imageNameFor(e.target);
    if(!name){hideTip();return;}
    showTip(name,e.clientX,e.clientY);
  },{passive:true});

  document.addEventListener('mouseleave',hideTip);

  document.addEventListener('touchstart',function(e){
    const name=imageNameFor(e.target);
    if(!name)return;
    const t=e.touches&&e.touches[0];
    if(!t)return;
    showTip(name,t.clientX,t.clientY);
    clearTimeout(touchTimer);
    touchTimer=setTimeout(hideTip,2200);
  },{passive:true});

  document.addEventListener('click',function(e){
    if(!replaceMode)return;
    if(e.target.closest&&e.target.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageEditOverlay'))return;
    const target=targetFromElement(e.target);
    if(!target){setStatus('No local TEST image found there · click another image');return;}
    e.preventDefault();
    e.stopPropagation();
    setReplaceMode(false);
    showModal(target);
  },true);

  overlay.addEventListener('click',function(e){
    const action=e.target.closest&&e.target.closest('button[data-image-action]');
    if(action){
      if(action.dataset.imageAction==='cancel')closeModal();
      if(action.dataset.imageAction==='save')saveImageChange();
      return;
    }
    if(e.target===overlay)closeModal();
  });

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&overlay.classList.contains('open'))closeModal();
  });
})();