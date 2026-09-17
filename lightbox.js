(function(){
  'use strict';

  const style=document.createElement('style');
  style.textContent=`
    .gps-lightbox-image{cursor:zoom-in}
    .gps-lightbox-host{position:relative!important}
    .gps-lightbox-badge{position:absolute;right:12px;bottom:12px;z-index:6;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(12,12,11,.72);color:#fff;border:1px solid rgba(255,255,255,.32);box-shadow:0 6px 18px rgba(0,0,0,.25);pointer-events:none;opacity:0;transform:translateY(3px);transition:opacity .16s ease,transform .16s ease;font:700 18px/1 system-ui,-apple-system,sans-serif;backdrop-filter:blur(5px)}
    .gps-lightbox-host:hover>.gps-lightbox-badge,.gps-lightbox-host:focus-within>.gps-lightbox-badge{opacity:1;transform:none}
    #gpsLightbox{position:fixed;inset:0;z-index:99990;display:none;align-items:center;justify-content:center;padding:clamp(18px,4vw,52px);background:rgba(0,0,0,.88);backdrop-filter:blur(4px)}
    #gpsLightbox.open{display:flex}
    #gpsLightbox img{display:block;max-width:94vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 28px 90px rgba(0,0,0,.55);cursor:default}
    #gpsLightboxClose{position:fixed;right:18px;top:18px;z-index:2;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(20,20,18,.7);color:#fff;font:500 28px/1 system-ui,-apple-system,sans-serif;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(5px)}
    #gpsLightboxClose:hover{background:rgba(255,255,255,.16)}
    #gpsLightboxName{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:calc(100vw - 32px);padding:7px 11px;border-radius:999px;background:rgba(12,12,11,.66);color:#ddd;font:700 11px/1.2 system-ui,-apple-system,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
    body.gps-lightbox-open{overflow:hidden}
    @media(max-width:720px){.gps-lightbox-badge{opacity:.82;width:32px;height:32px;right:8px;bottom:8px}#gpsLightbox{padding:16px}#gpsLightbox img{max-width:96vw;max-height:86vh}#gpsLightboxClose{right:10px;top:10px}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='gpsLightbox';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Enlarged image');
  overlay.innerHTML='<button id="gpsLightboxClose" type="button" aria-label="Close enlarged image">×</button><img alt=""><div id="gpsLightboxName"></div>';
  document.body.appendChild(overlay);

  const large=overlay.querySelector('img');
  const closeBtn=overlay.querySelector('#gpsLightboxClose');
  const nameEl=overlay.querySelector('#gpsLightboxName');
  let lastFocus=null;

  function filename(url){
    try{return decodeURIComponent(new URL(url,location.href).pathname.split('/').pop()||'');}
    catch(e){return String(url||'').split('/').pop().split('?')[0];}
  }

  function eligible(img){
    if(!img||img.tagName!=='IMG')return false;
    if(!img.closest('main'))return false;
    if(img.closest('a,button,#gpsLightbox,#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsImageNameTip'))return false;
    const src=img.currentSrc||img.getAttribute('src')||'';
    if(!src)return false;
    return true;
  }

  function install(img){
    if(!eligible(img)||img.dataset.gpsLightbox==='1')return;
    img.dataset.gpsLightbox='1';
    img.classList.add('gps-lightbox-image');
    const host=img.parentElement;
    if(!host)return;
    host.classList.add('gps-lightbox-host');
    if(!host.querySelector(':scope > .gps-lightbox-badge')){
      const badge=document.createElement('span');
      badge.className='gps-lightbox-badge';
      badge.setAttribute('aria-hidden','true');
      badge.textContent='⌕';
      host.appendChild(badge);
    }
  }

  function scan(){document.querySelectorAll('main img').forEach(install);}
  scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});

  function open(img){
    if(document.body.classList.contains('gps-image-pick'))return;
    lastFocus=document.activeElement;
    large.src=img.currentSrc||img.src;
    large.alt=img.alt||'';
    nameEl.textContent=filename(large.src);
    overlay.classList.add('open');
    document.body.classList.add('gps-lightbox-open');
    closeBtn.focus({preventScroll:true});
  }

  function close(){
    if(!overlay.classList.contains('open'))return;
    overlay.classList.remove('open');
    document.body.classList.remove('gps-lightbox-open');
    large.removeAttribute('src');
    if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});
  }

  document.addEventListener('click',function(e){
    const img=e.target.closest&&e.target.closest('img.gps-lightbox-image');
    if(!img||!eligible(img))return;
    if(document.body.classList.contains('gps-image-pick'))return;
    e.preventDefault();
    open(img);
  });

  overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
  closeBtn.addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
})();
