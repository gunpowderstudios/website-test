(function(){
  'use strict';

  const STORAGE_KEY='gps-visual-editor:'+location.pathname;
  const main=document.querySelector('main');
  const panel=document.querySelector('#gpsEditorPanel');
  if(!main||!panel)return;

  const FONT_OPTIONS=[
    ['', 'Site default'],
    ['system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif','Site sans'],
    ['Georgia, "Times New Roman", serif','Georgia'],
    ['Arial, Helvetica, sans-serif','Arial'],
    ['Verdana, Geneva, sans-serif','Verdana'],
    ['"Trebuchet MS", Arial, sans-serif','Trebuchet'],
    ['"Times New Roman", Times, serif','Times New Roman'],
    ['"Courier New", Courier, monospace','Courier New'],
    ['Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif','Impact']
  ];

  const uiStyle=document.createElement('style');
  uiStyle.textContent=`
    #gpsEditorPanel .gps-visual-btn{background:#203343;border-color:#36566e}
    #gpsEditorPanel .gps-visual-btn:hover{background:#29465e}
    #gpsEditorPanel .gps-visual-btn:disabled{opacity:.4}
    #gpsEditorPanel .gps-duplicate-btn{background:#294b35;border-color:#3f704d}
    #gpsEditorPanel .gps-duplicate-btn:hover{background:#356344}
    #gpsEditorPanel .gps-delete-btn{background:#6d201b;border-color:#8f3029}
    #gpsEditorPanel .gps-delete-btn:hover{background:#852a23}
    body.gps-editing .gps-section-selected{outline:3px solid #7ac7ff!important;outline-offset:-3px!important}
    body.gps-editing .gps-text-selected{outline:3px solid #ffcf66!important;outline-offset:3px!important}
    #gpsStyleOverlay{position:fixed;inset:0;z-index:100004;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.7);font-family:system-ui,-apple-system,sans-serif}
    #gpsStyleOverlay.open{display:grid}
    #gpsStyleCard{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;padding:22px;border-radius:18px;background:#191816;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.52)}
    #gpsStyleCard h3{margin:0 0 6px;font:850 22px/1.2 system-ui,-apple-system,sans-serif}
    #gpsStyleCard .gps-style-help{margin:0 0 18px;color:#cfc5b6;font:500 13px/1.45 system-ui,-apple-system,sans-serif}
    #gpsStyleCard .gps-field{margin:14px 0}
    #gpsStyleCard label.gps-label{display:block;margin-bottom:7px;color:#e9dfd0;font:800 12px/1.2 system-ui,-apple-system,sans-serif;text-transform:uppercase;letter-spacing:.06em}
    #gpsStyleCard select,#gpsStyleCard input[type="number"]{width:100%;padding:11px 12px;border:1px solid #56514a;border-radius:10px;background:#0f0e0d;color:#fff;font:600 14px/1.2 system-ui,-apple-system,sans-serif}
    #gpsStyleCard input[type="color"]{width:58px;height:42px;padding:3px;border:1px solid #56514a;border-radius:9px;background:#0f0e0d;cursor:pointer}
    #gpsStyleCard .gps-colour-row{display:flex;align-items:center;gap:12px}
    #gpsStyleCard .gps-colour-row span{color:#cfc5b6;font:600 12px/1.3 system-ui,-apple-system,sans-serif}
    #gpsStyleCard .gps-size-row{display:grid;grid-template-columns:44px 1fr 44px;gap:8px;align-items:center}
    #gpsStyleCard .gps-size-row button{height:42px;border:1px solid #56514a;border-radius:10px;background:#292724;color:#fff;font:900 20px/1 system-ui;cursor:pointer}
    #gpsStyleCard .gps-style-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1)}
    #gpsStyleCard .gps-style-actions button{border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#292724;color:#fff;padding:10px 14px;font:800 12px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
    #gpsStyleCard .gps-style-actions .gps-apply{background:#65a9ff;color:#101821;border-color:#65a9ff}
    #gpsStyleCard .gps-style-actions .gps-reset{background:#6d201b;border-color:#8f3029}
    @media(max-width:650px){#gpsStyleCard{padding:18px}#gpsEditorPanel .gps-visual-btn{padding:9px 10px}}
  `;
  document.head.appendChild(uiStyle);

  function cleanText(value){return String(value||'').replace(/\s+/g,' ').trim();}
  function slug(value){return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);}

  function listSections(root){
    if(!root)return[];
    return Array.from(root.children).filter(el=>el.nodeType===1);
  }

  function buildSectionMap(root){
    const map={};
    const keys=[];
    const seen={};
    listSections(root).forEach((el,i)=>{
      let base='';
      if(el.id)base='id:'+el.id;
      if(!base){
        const cls=Array.from(el.classList).filter(c=>!c.startsWith('gps-')).join('.');
        const heading=el.querySelector('h1,h2,h3');
        const hs=heading?slug(heading.textContent):'';
        base=(el.tagName||'div').toLowerCase()+':'+(cls||'plain')+':'+(hs||('item-'+i));
      }
      seen[base]=(seen[base]||0)+1;
      const key=seen[base]>1?base+'~'+seen[base]:base;
      map[key]=el;
      keys.push(key);
    });
    return {map,keys};
  }

  const initialSections=buildSectionMap(main);
  const sectionElements=initialSections.map;
  const sectionKeyByElement=new Map();
  Object.keys(sectionElements).forEach(key=>sectionKeyByElement.set(sectionElements[key],key));
  let originalOrder=initialSections.keys.slice();
  const originalSectionStyles={};
  Object.keys(sectionElements).forEach(key=>originalSectionStyles[key]=sectionElements[key].getAttribute('style')||'');

  const cloneIdByElement=new Map();
  let nextCloneNumber=1;

  function isCloneSection(el){return !!(el&&cloneIdByElement.has(el));}
  function makeCloneId(){return 'clone-'+(nextCloneNumber++);}
  function stripEditorState(root,forSource){
    if(!root)return root;
    const nodes=[root].concat(Array.from(root.querySelectorAll('*')));
    nodes.forEach(el=>{
      el.classList.remove('gps-section-selected','gps-text-selected','gps-link-selected');
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      if(forSource){
        Array.from(el.attributes||[]).forEach(attr=>{
          if(attr.name.indexOf('data-gps-')===0)el.removeAttribute(attr.name);
        });
      }
    });
    return root;
  }
  function sectionHtml(el,forSource){
    const clone=el.cloneNode(true);
    stripEditorState(clone,!!forSource);
    return clone.outerHTML;
  }
  function sectionFromHtml(html,cloneId){
    const template=document.createElement('template');
    template.innerHTML=String(html||'').trim();
    const el=template.content.firstElementChild;
    if(!el)return null;
    cloneIdByElement.set(el,cloneId||makeCloneId());
    const n=Number(String(cloneId||'').replace(/^clone-/,''));
    if(Number.isFinite(n)&&n>=nextCloneNumber)nextCloneNumber=n+1;
    return el;
  }
  function removeDuplicateIds(root){
    if(!root)return;
    [root].concat(Array.from(root.querySelectorAll('[id]'))).forEach(el=>el.removeAttribute('id'));
  }

  const editableElements={};
  document.querySelectorAll('[data-gps-edit-id]').forEach(el=>editableElements[el.dataset.gpsEditId]=el);
  const originalElementStyles={};

  let activeText=null;
  let activeSection=null;
  let styleMode=null;
  let styleInitial=null;
  let bgTouched=false;
  let colourTouched=false;
  let sizeTouched=false;
  let familyTouched=false;

  const styleOverlay=document.createElement('div');
  styleOverlay.id='gpsStyleOverlay';
  styleOverlay.innerHTML=`
    <div id="gpsStyleCard" role="dialog" aria-modal="true" aria-labelledby="gpsStyleTitle">
      <h3 id="gpsStyleTitle">Style</h3>
      <p class="gps-style-help" id="gpsStyleHelp"></p>
      <div id="gpsTextStyleFields">
        <div class="gps-field">
          <label class="gps-label">Font size</label>
          <div class="gps-size-row">
            <button type="button" data-size-step="-1" aria-label="Decrease font size">−</button>
            <input id="gpsFontSize" type="number" min="8" max="160" step="1">
            <button type="button" data-size-step="1" aria-label="Increase font size">+</button>
          </div>
        </div>
        <div class="gps-field">
          <label class="gps-label" for="gpsFontFamily">Font</label>
          <select id="gpsFontFamily"></select>
        </div>
        <div class="gps-field">
          <label class="gps-label">Text colour</label>
          <div class="gps-colour-row"><input id="gpsTextColour" type="color"><span>Choose a colour for this text.</span></div>
        </div>
      </div>
      <div id="gpsSectionStyleFields" hidden>
        <div class="gps-field">
          <label class="gps-label">Background colour</label>
          <div class="gps-colour-row"><input id="gpsBackgroundColour" type="color"><span>Applying this replaces any image or gradient background on the section.</span></div>
        </div>
        <div class="gps-field">
          <label class="gps-label">Section text colour</label>
          <div class="gps-colour-row"><input id="gpsSectionTextColour" type="color"><span>Changes the default text colour for this section.</span></div>
        </div>
      </div>
      <div class="gps-style-actions">
        <button type="button" class="gps-reset" data-style-action="reset">Reset original</button>
        <button type="button" data-style-action="cancel">Cancel</button>
        <button type="button" class="gps-apply" data-style-action="apply">Apply</button>
      </div>
    </div>`;
  document.body.appendChild(styleOverlay);

  const title=styleOverlay.querySelector('#gpsStyleTitle');
  const help=styleOverlay.querySelector('#gpsStyleHelp');
  const textFields=styleOverlay.querySelector('#gpsTextStyleFields');
  const sectionFields=styleOverlay.querySelector('#gpsSectionStyleFields');
  const fontSize=styleOverlay.querySelector('#gpsFontSize');
  const fontFamily=styleOverlay.querySelector('#gpsFontFamily');
  const textColour=styleOverlay.querySelector('#gpsTextColour');
  const backgroundColour=styleOverlay.querySelector('#gpsBackgroundColour');
  const sectionTextColour=styleOverlay.querySelector('#gpsSectionTextColour');

  FONT_OPTIONS.forEach(([value,label])=>{
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label;
    fontFamily.appendChild(option);
  });

  function colourToHex(value,fallback){
    const v=String(value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(v))return v;
    if(/^#[0-9a-f]{3}$/i.test(v))return '#'+v.slice(1).split('').map(x=>x+x).join('');
    const m=v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if(m)return '#'+[m[1],m[2],m[3]].map(n=>Math.max(0,Math.min(255,Number(n))).toString(16).padStart(2,'0')).join('');
    return fallback||'#ffffff';
  }

  function rememberElementStyle(el){
    if(isCloneSection(findSection(el)))return;
    const id=el&&el.dataset?el.dataset.gpsEditId:null;
    if(!id)return;
    if(!(id in originalElementStyles))originalElementStyles[id]=el.getAttribute('style')||'';
  }

  function findSection(target){
    let el=target;
    while(el&&el!==main){
      if(el.parentElement===main)return el;
      el=el.parentElement;
    }
    return null;
  }

  function selectTargets(target){
    if(!document.body.classList.contains('gps-editing'))return;
    if(target.closest('#gpsEditorPanel,#gpsEditorToggle,#gpsTokenOverlay,#gpsLinkOverlay,#gpsStyleOverlay'))return;

    const text=target.closest('[data-gps-edit-id]');
    const section=findSection(target);
    if(activeText)activeText.classList.remove('gps-text-selected');
    if(activeSection)activeSection.classList.remove('gps-section-selected');
    activeText=text||null;
    activeSection=section||null;
    if(activeText)activeText.classList.add('gps-text-selected');
    if(activeSection)activeSection.classList.add('gps-section-selected');
    updateButtons();
  }

  function updateButtons(){
    textStyleBtn.disabled=!activeText;
    sectionStyleBtn.disabled=!activeSection;
    upBtn.disabled=!activeSection||!activeSection.previousElementSibling;
    downBtn.disabled=!activeSection||!activeSection.nextElementSibling;
    duplicateBtn.disabled=!activeSection;
    deleteBtn.disabled=!activeSection;
  }

  function status(message){
    const el=panel.querySelector('.gps-status');
    if(el)el.textContent=message;
  }

  function currentDraft(){
    const sectionStyles={};
    Object.keys(sectionElements).forEach(key=>{
      const now=sectionElements[key].getAttribute('style')||'';
      if(now!==originalSectionStyles[key])sectionStyles[key]=now;
    });

    const elementStyles={};
    Object.keys(originalElementStyles).forEach(id=>{
      const el=editableElements[id];
      if(!el)return;
      const now=el.getAttribute('style')||'';
      if(now!==originalElementStyles[id])elementStyles[id]=now;
    });

    const currentSections=listSections(main);
    const originalSequence=currentSections.map(el=>sectionKeyByElement.get(el)).filter(Boolean);
    const hasClones=currentSections.some(el=>isCloneSection(el));
    const sameOriginals=JSON.stringify(originalSequence)===JSON.stringify(originalOrder) && originalSequence.length===currentSections.length;
    const structure=(!sameOriginals||hasClones)?currentSections.map(el=>{
      const key=sectionKeyByElement.get(el);
      if(key)return {type:'original',key};
      const id=cloneIdByElement.get(el)||makeCloneId();
      cloneIdByElement.set(el,id);
      return {type:'clone',id,html:sectionHtml(el,false)};
    }):null;

    return {
      order:null,
      structure,
      sectionStyles,
      elementStyles
    };
  }

  function changeCount(draft){
    const d=draft||currentDraft();
    return Object.keys(d.sectionStyles||{}).length+Object.keys(d.elementStyles||{}).length+(d.structure?1:(d.order?1:0));
  }

  function saveDraft(){
    const d=currentDraft();
    if(changeCount(d))localStorage.setItem(STORAGE_KEY,JSON.stringify(d));
    else localStorage.removeItem(STORAGE_KEY);
    return d;
  }

  function readDraft(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){return{};}
  }

  function setStyleAttr(el,value){
    if(!el)return;
    if(value)el.setAttribute('style',value);
    else el.removeAttribute('style');
  }

  function applyDraft(){
    const d=readDraft();
    Object.keys(d.sectionStyles||{}).forEach(key=>{
      if(sectionElements[key])setStyleAttr(sectionElements[key],d.sectionStyles[key]);
    });
    Object.keys(d.elementStyles||{}).forEach(id=>{
      const el=editableElements[id];
      if(!el)return;
      rememberElementStyle(el);
      setStyleAttr(el,d.elementStyles[id]);
    });
    if(Array.isArray(d.structure)){
      listSections(main).filter(el=>isCloneSection(el)).forEach(el=>el.remove());
      const wanted=[];
      d.structure.forEach(item=>{
        if(item&&item.type==='original'&&sectionElements[item.key])wanted.push(sectionElements[item.key]);
        if(item&&item.type==='clone'){
          const el=sectionFromHtml(item.html,item.id);
          if(el)wanted.push(el);
        }
      });
      wanted.forEach(el=>main.appendChild(el));
      Object.keys(sectionElements).forEach(key=>{
        const el=sectionElements[key];
        if(el&&!wanted.includes(el))el.remove();
      });
    }else if(Array.isArray(d.order)){
      d.order.forEach(key=>{if(sectionElements[key])main.appendChild(sectionElements[key]);});
    }
  }

  applyDraft();

  const saveButton=panel.querySelector('[data-action="save"]');
  const textStyleBtn=document.createElement('button');
  textStyleBtn.type='button';
  textStyleBtn.className='gps-visual-btn';
  textStyleBtn.textContent='Text style';
  textStyleBtn.disabled=true;
  textStyleBtn.dataset.visualAction='text';

  const sectionStyleBtn=document.createElement('button');
  sectionStyleBtn.type='button';
  sectionStyleBtn.className='gps-visual-btn';
  sectionStyleBtn.textContent='Section style';
  sectionStyleBtn.disabled=true;
  sectionStyleBtn.dataset.visualAction='section';

  const upBtn=document.createElement('button');
  upBtn.type='button';
  upBtn.className='gps-visual-btn';
  upBtn.textContent='↑ Section';
  upBtn.disabled=true;
  upBtn.dataset.visualAction='up';

  const downBtn=document.createElement('button');
  downBtn.type='button';
  downBtn.className='gps-visual-btn';
  downBtn.textContent='↓ Section';
  downBtn.disabled=true;
  downBtn.dataset.visualAction='down';

  const duplicateBtn=document.createElement('button');
  duplicateBtn.type='button';
  duplicateBtn.className='gps-visual-btn gps-duplicate-btn';
  duplicateBtn.textContent='Duplicate section';
  duplicateBtn.disabled=true;
  duplicateBtn.dataset.visualAction='duplicate';

  const deleteBtn=document.createElement('button');
  deleteBtn.type='button';
  deleteBtn.className='gps-visual-btn gps-delete-btn';
  deleteBtn.textContent='Delete section';
  deleteBtn.disabled=true;
  deleteBtn.dataset.visualAction='delete';

  panel.insertBefore(textStyleBtn,saveButton);
  panel.insertBefore(sectionStyleBtn,saveButton);
  panel.insertBefore(upBtn,saveButton);
  panel.insertBefore(downBtn,saveButton);
  panel.insertBefore(duplicateBtn,saveButton);
  panel.insertBefore(deleteBtn,saveButton);

  function openTextStyle(){
    if(!activeText)return;
    rememberElementStyle(activeText);
    styleMode='text';
    const computed=getComputedStyle(activeText);
    const inline=activeText.style;
    styleInitial={
      style:activeText.getAttribute('style')||'',
      size:parseFloat(computed.fontSize)||16,
      colour:colourToHex(computed.color,'#ffffff'),
      family:inline.fontFamily||''
    };
    title.textContent='Text style';
    help.textContent='Change this text only. Font sizes are saved in pixels so the result stays predictable.';
    textFields.hidden=false;
    sectionFields.hidden=true;
    fontSize.value=Math.round(styleInitial.size);
    fontFamily.value=styleInitial.family;
    if(fontFamily.value!==styleInitial.family)fontFamily.value='';
    textColour.value=styleInitial.colour;
    sizeTouched=false;familyTouched=false;colourTouched=false;bgTouched=false;
    styleOverlay.classList.add('open');
  }

  function openSectionStyle(){
    if(!activeSection)return;
    styleMode='section';
    const computed=getComputedStyle(activeSection);
    styleInitial={
      style:activeSection.getAttribute('style')||'',
      background:colourToHex(computed.backgroundColor,'#ffffff'),
      colour:colourToHex(computed.color,'#ffffff')
    };
    title.textContent='Section style';
    help.textContent='Change the whole section. You can also move it with the ↑ Section and ↓ Section buttons.';
    textFields.hidden=true;
    sectionFields.hidden=false;
    backgroundColour.value=styleInitial.background;
    sectionTextColour.value=styleInitial.colour;
    bgTouched=false;colourTouched=false;sizeTouched=false;familyTouched=false;
    styleOverlay.classList.add('open');
  }

  function closeStyle(){styleOverlay.classList.remove('open');}

  function applyStyle(){
    if(styleMode==='text'&&activeText){
      if(sizeTouched)activeText.style.fontSize=Math.max(8,Math.min(160,Number(fontSize.value)||styleInitial.size))+'px';
      if(familyTouched){
        if(fontFamily.value)activeText.style.fontFamily=fontFamily.value;
        else activeText.style.removeProperty('font-family');
      }
      if(colourTouched)activeText.style.color=textColour.value;
      saveDraft();
      status('Text style changed · press Save to commit');
    }
    if(styleMode==='section'&&activeSection){
      if(bgTouched)activeSection.style.background=backgroundColour.value;
      if(colourTouched)activeSection.style.color=sectionTextColour.value;
      saveDraft();
      status('Section style changed · press Save to commit');
    }
    closeStyle();
  }

  function resetStyle(){
    if(styleMode==='text'&&activeText){
      if(isCloneSection(findSection(activeText)))setStyleAttr(activeText,styleInitial.style||'');
      else{
        const id=activeText.dataset.gpsEditId;
        setStyleAttr(activeText,originalElementStyles[id]||'');
      }
      saveDraft();
      status('Text style reset to original · press Save to commit');
    }
    if(styleMode==='section'&&activeSection){
      if(isCloneSection(activeSection))setStyleAttr(activeSection,styleInitial.style||'');
      else{
        const key=sectionKeyByElement.get(activeSection);
        if(key)setStyleAttr(activeSection,originalSectionStyles[key]||'');
      }
      saveDraft();
      status('Section style reset to original · press Save to commit');
    }
    closeStyle();
  }

  function moveSection(direction){
    if(!activeSection)return;
    if(direction<0){
      const prev=activeSection.previousElementSibling;
      if(prev)main.insertBefore(activeSection,prev);
    }else{
      const next=activeSection.nextElementSibling;
      if(next)main.insertBefore(next,activeSection);
    }
    saveDraft();
    updateButtons();
    try{activeSection.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}
    status('Section moved · press Save to commit');
  }

  function duplicateSection(){
    if(!activeSection)return;
    if(activeSection.querySelector('.hero-slider')){
      status('The hero slider cannot be duplicated safely · choose another section');
      return;
    }
    const clone=activeSection.cloneNode(true);
    removeDuplicateIds(clone);
    clone.classList.remove('gps-section-selected');
    clone.querySelectorAll('.gps-text-selected,.gps-link-selected').forEach(el=>el.classList.remove('gps-text-selected','gps-link-selected'));
    const id=makeCloneId();
    cloneIdByElement.set(clone,id);
    activeSection.insertAdjacentElement('afterend',clone);
    if(document.body.classList.contains('gps-editing')){
      clone.querySelectorAll('[data-gps-edit-id]').forEach(el=>{
        el.setAttribute('contenteditable','true');
        el.setAttribute('spellcheck','true');
      });
    }
    if(activeSection)activeSection.classList.remove('gps-section-selected');
    activeSection=clone;
    activeText=null;
    clone.classList.add('gps-section-selected');
    saveDraft();
    updateButtons();
    try{clone.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}
    status('Section duplicated · edit it, then press Save to commit');
  }

  function deleteSection(){
    if(!activeSection)return;
    if(!confirm('Delete this whole section? You can use Reset page before saving if you change your mind.'))return;
    const doomed=activeSection;
    const next=doomed.nextElementSibling||doomed.previousElementSibling;
    doomed.remove();
    activeText=null;
    activeSection=next||null;
    if(activeSection)activeSection.classList.add('gps-section-selected');
    saveDraft();
    updateButtons();
    status('Section deleted · press Save to commit');
  }

  document.addEventListener('click',e=>selectTargets(e.target),true);

  panel.addEventListener('click',e=>{
    const btn=e.target.closest('[data-visual-action]');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    const action=btn.dataset.visualAction;
    if(action==='text')openTextStyle();
    if(action==='section')openSectionStyle();
    if(action==='up')moveSection(-1);
    if(action==='down')moveSection(1);
    if(action==='duplicate')duplicateSection();
    if(action==='delete')deleteSection();
  });

  styleOverlay.addEventListener('click',e=>{
    const step=e.target.closest('[data-size-step]');
    if(step){
      e.preventDefault();
      const n=Math.max(8,Math.min(160,(Number(fontSize.value)||16)+Number(step.dataset.sizeStep)));
      fontSize.value=n;
      sizeTouched=true;
      return;
    }
    const btn=e.target.closest('[data-style-action]');
    if(btn){
      e.preventDefault();
      if(btn.dataset.styleAction==='apply')applyStyle();
      if(btn.dataset.styleAction==='reset')resetStyle();
      if(btn.dataset.styleAction==='cancel')closeStyle();
      return;
    }
    if(e.target===styleOverlay)closeStyle();
  });

  fontSize.addEventListener('input',()=>sizeTouched=true);
  fontFamily.addEventListener('change',()=>familyTouched=true);
  textColour.addEventListener('input',()=>colourTouched=true);
  backgroundColour.addEventListener('input',()=>bgTouched=true);
  sectionTextColour.addEventListener('input',()=>colourTouched=true);

  document.addEventListener('keydown',e=>{
    if(!styleOverlay.classList.contains('open'))return;
    if(e.key==='Escape'){e.preventDefault();closeStyle();}
  });

  document.addEventListener('input',e=>{
    const section=findSection(e.target);
    if(!section||!isCloneSection(section))return;
    saveDraft();
    status('Duplicated section edited · press Save to commit');
  });

  const cloneAttributeObserver=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.type==='attributes'&&isCloneSection(findSection(m.target))))return;
    saveDraft();
  });
  cloneAttributeObserver.observe(main,{subtree:true,attributes:true,attributeFilter:['href','target','rel','style']});

  function applyToSource(sourceDoc,sourceEditableMap){
    const d=currentDraft();
    const missing=[];
    const sourceMain=sourceDoc.querySelector('main');
    const sourceSections=buildSectionMap(sourceMain);

    Object.keys(d.sectionStyles||{}).forEach(key=>{
      const el=sourceSections.map[key];
      if(!el){missing.push('section:'+key);return;}
      setStyleAttr(el,d.sectionStyles[key]);
    });

    Object.keys(d.elementStyles||{}).forEach(id=>{
      const el=sourceEditableMap[id];
      if(!el){missing.push('style:'+id);return;}
      setStyleAttr(el,d.elementStyles[id]);
    });

    if(Array.isArray(d.structure)&&sourceMain){
      const wanted=[];
      d.structure.forEach(item=>{
        if(item&&item.type==='original'){
          const el=sourceSections.map[item.key];
          if(el)wanted.push(el);else missing.push('structure:'+item.key);
        }else if(item&&item.type==='clone'){
          const template=sourceDoc.createElement('template');
          template.innerHTML=String(item.html||'').trim();
          const el=template.content.firstElementChild;
          if(!el){missing.push('clone:'+String(item.id||''));return;}
          stripEditorState(el,true);
          wanted.push(el);
        }
      });
      while(sourceMain.firstChild)sourceMain.removeChild(sourceMain.firstChild);
      wanted.forEach(el=>sourceMain.appendChild(el));
    }else if(Array.isArray(d.order)&&sourceMain){
      d.order.forEach(key=>{
        const el=sourceSections.map[key];
        if(el)sourceMain.appendChild(el);
        else missing.push('order:'+key);
      });
    }
    return missing;
  }

  function markSaved(){
    const hadStructure=!!currentDraft().structure;
    originalOrder=listSections(main).map(el=>sectionKeyByElement.get(el)).filter(Boolean);
    Object.keys(sectionElements).forEach(key=>{
      if(sectionElements[key])originalSectionStyles[key]=sectionElements[key].getAttribute('style')||'';
    });
    Object.keys(originalElementStyles).forEach(id=>{
      if(editableElements[id])originalElementStyles[id]=editableElements[id].getAttribute('style')||'';
    });
    localStorage.removeItem(STORAGE_KEY);
    if(hadStructure)setTimeout(()=>location.reload(),1400);
  }

  function reset(){
    listSections(main).filter(el=>isCloneSection(el)).forEach(el=>el.remove());
    Object.keys(sectionElements).forEach(key=>setStyleAttr(sectionElements[key],originalSectionStyles[key]||''));
    Object.keys(originalElementStyles).forEach(id=>{
      if(editableElements[id])setStyleAttr(editableElements[id],originalElementStyles[id]||'');
    });
    originalOrder.forEach(key=>{if(sectionElements[key])main.appendChild(sectionElements[key]);});
    localStorage.removeItem(STORAGE_KEY);
    if(activeText)activeText.classList.remove('gps-text-selected');
    if(activeSection)activeSection.classList.remove('gps-section-selected');
    activeText=null;activeSection=null;updateButtons();
  }

  window.GPSVisualEditor={
    getChanges:currentDraft,
    getChangeCount:()=>changeCount(currentDraft()),
    applyToSource,
    markSaved,
    reset
  };
})();