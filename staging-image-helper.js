(function(){
  'use strict';
  const tip=document.createElement('div');
  tip.id='gpsImageNameTip';
  tip.setAttribute('aria-hidden','true');
  tip.style.cssText='position:fixed;z-index:100002;display:none;pointer-events:none;max-width:min(420px,calc(100vw - 24px));padding:8px 11px;border-radius:9px;background:rgba(12,12,11,.94);color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 8px 24px rgba(0,0,0,.32);font:800 12px/1.25 system-ui,-apple-system,sans-serif;letter-spacing:.01em;white-space:normal;overflow-wrap:anywhere';
  document.body.appendChild(tip);

  let touchTimer=null;

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

  function imageNameFor(el){
    if(!el||!el.closest)return '';
    if(el.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageNameTip'))return '';
    if(el.tagName==='IMG')return filenameFromUrl(el.currentSrc||el.getAttribute('src')||'');
    let node=el;
    while(node&&node!==document.body){
      const bg=getComputedStyle(node).backgroundImage;
      if(bg&&bg!=='none'){
        const match=bg.match(/url\((['"]?)(.*?)\1\)/i);
        if(match&&match[2]){
          const name=filenameFromUrl(match[2]);
          if(name)return name;
        }
      }
      node=node.parentElement;
    }
    return '';
  }

  function hide(){
    tip.style.display='none';
    tip.setAttribute('aria-hidden','true');
  }

  function show(name,x,y){
    if(!name){hide();return;}
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

  document.addEventListener('mousemove',function(e){
    const name=imageNameFor(e.target);
    if(!name){hide();return;}
    show(name,e.clientX,e.clientY);
  },{passive:true});

  document.addEventListener('mouseleave',hide);

  document.addEventListener('touchstart',function(e){
    const name=imageNameFor(e.target);
    if(!name)return;
    const t=e.touches&&e.touches[0];
    if(!t)return;
    show(name,t.clientX,t.clientY);
    clearTimeout(touchTimer);
    touchTimer=setTimeout(hide,2200);
  },{passive:true});
})();