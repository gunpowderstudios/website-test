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

  const fileInput=document.createElement('input');
  fileInput.type='file';
  fileInput.accept='image/jpeg,image/png,.jpg,.jpeg,.png';
  fileInput.style.display='none';
  document.body.appendChild(fileInput);

  const helperStyle=document.createElement('style');
  helperStyle.textContent=`
    body.gps-image-pick{cursor:crosshair!important}
    body.gps-image-pick img{outline:2px dashed rgba(217,156,56,.72);outline-offset:-2px}
    body.gps-image-pick .feature,body.gps-image-pick .game-media,body.gps-image-pick .cta,body.gps-image-pick .hero-image,body.gps-image-pick .hero-image-card,body.gps-image-pick .photo,body.gps-image-pick .gallery-item,body.gps-image-pick .showcase-item,body.gps-image-pick .hero-visual{cursor:crosshair}
  `;
  document.head.appendChild(helperStyle);

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

  function firstBackgroundUrl(el){
    const bg=getComputedStyle(el).backgroundImage;
    if(!bg||bg==='none')return '';
    const match=bg.match(/url\((['"]?)(.*?)\1\)/i);
    return match&&match[2]?match[2]:'';
  }

  function targetFromElement(el){
    if(!el||!el.closest)return null;
    if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageNameTip'))return null;

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
    setStatus(on?'Click the image or image panel you want to replace':'TEST editor · Save commits to GitHub');
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

  async function uploadSelected(file){
    if(!selectedTarget||!file)return;
    const ext=(selectedTarget.repoPath.split('.').pop()||'').toLowerCase();
    const isJpg=ext==='jpg'||ext==='jpeg';
    const isPng=ext==='png';
    if(!isJpg&&!isPng){setStatus('That image is not a JPG or PNG');return;}
    if((isJpg&&file.type!=='image/jpeg')||(isPng&&file.type!=='image/png')){
      setStatus('Choose a '+(isJpg?'JPG':'PNG')+' file to replace '+selectedTarget.filename);
      return;
    }

    const token=tokenForUpload();
    if(!token){setStatus('Image upload cancelled · no GitHub token');return;}

    const encodedPath=selectedTarget.repoPath.split('/').map(encodeURIComponent).join('/');
    const api='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+encodedPath;
    if(replaceBtn){replaceBtn.disabled=true;replaceBtn.textContent='Uploading…';}
    setStatus('Uploading '+selectedTarget.filename+' to TEST GitHub…');

    try{
      const current=await githubJson(api+'?ref='+encodeURIComponent(BRANCH),{method:'GET'},token,true);
      const buffer=await file.arrayBuffer();
      const body={message:'Editor image update: '+selectedTarget.repoPath,content:bytesToBase64(buffer),branch:BRANCH};
      if(current&&current.sha)body.sha=current.sha;
      await githubJson(api,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},token,false);

      if(selectedTarget.kind==='img'){
        const preview=URL.createObjectURL(file);
        selectedTarget.element.onerror=null;
        selectedTarget.element.src=preview;
      }
      setStatus('Image saved to TEST GitHub ✓ · Pages will update shortly');
      setReplaceMode(false);
    }catch(error){
      if(error.status===401||error.status===403){
        sessionStorage.removeItem(TOKEN_KEY);
        setStatus('GitHub rejected the token · check Contents: Read and write');
      }else if(error.status===409){
        setStatus('GitHub changed while uploading · reload and try again');
      }else{
        setStatus('Image upload failed · '+error.message);
      }
      console.error('TEST image upload failed',error);
    }finally{
      if(replaceBtn){replaceBtn.disabled=false;replaceBtn.textContent=replaceMode?'Cancel image replace':'Replace image';}
      selectedTarget=null;
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
    if(e.target.closest&&e.target.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay'))return;
    const target=targetFromElement(e.target);
    if(!target){setStatus('No local TEST image found there · click another image');return;}
    e.preventDefault();
    e.stopPropagation();
    selectedTarget=target;
    setStatus('Replacing '+target.filename+' · choose a '+(/\.png$/i.test(target.repoPath)?'PNG':'JPG'));
    fileInput.value='';
    fileInput.click();
  },true);

  fileInput.addEventListener('change',function(){
    const file=fileInput.files&&fileInput.files[0];
    if(file)uploadSelected(file);
  });
})();