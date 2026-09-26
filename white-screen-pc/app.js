'use strict';
(() => {
  const viewer=document.querySelector('#viewer'), stage=document.querySelector('#stage'), image=document.querySelector('#render'), range=document.querySelector('#frame-range'), count=document.querySelector('.frame-count'), tag=document.querySelector('.frame-tag'), error=document.querySelector('#media-error');
  const modes={turn:72,explode:48}, positions={turn:0,explode:0}; let mode='turn';
  const cache=new Map(); const path=(m,i)=>`frames/${m}_${String(i).padStart(3,'0')}.webp`;
  function warm(m,i){if(i<0||i>=modes[m])return;const p=path(m,i);if(!cache.has(p)){const im=new Image();im.src=p;cache.set(p,im);}}
  const stepBack=document.querySelector('[data-step="-1"]'), stepFwd=document.querySelector('[data-step="1"]');
  let settleTimer=0;
  function show(i){
    positions[mode]=Math.max(0,Math.min(modes[mode]-1,Math.round(i)));const n=positions[mode];
    range.max=modes[mode]-1;range.value=n;range.setAttribute('aria-valuetext',`${mode==='turn'?'Rotation':'Explosion'} frame ${n+1} of ${modes[mode]}`);
    count.textContent=`${String(n+1).padStart(2,'0')} / ${modes[mode]}`;tag.textContent=`${mode==='turn'?'Turn':'Explode'} / ${String(n+1).padStart(3,'0')}`;
    stepBack.disabled=n===0;stepFwd.disabled=n===modes[mode]-1;
    const next=path(mode,n);
    if(image.getAttribute('src')!==next){
      // dim while the next frame decodes, so a fast scrub reads as motion rather than a flicker
      image.classList.add('settling');stage.classList.add('busy');
      const swap=()=>{image.src=next;image.classList.remove('settling');stage.classList.remove('busy');};
      const im=new Image();
      im.onload=im.onerror=swap;im.src=next;
      clearTimeout(settleTimer);settleTimer=setTimeout(swap,220);
    }
    image.alt=mode==='turn'?`Original rendered white Thermalright A70 Vision build, rotation frame ${n+1} of 72`:`Original rendered build separating into components, explosion frame ${n+1} of 48`;
    for(let d=-3;d<=3;d++)warm(mode,n+d);
  }
  image.addEventListener('error',()=>{error.hidden=false;});image.addEventListener('load',()=>{error.hidden=true;});
  document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));show(positions[mode]);}));
  range.addEventListener('input',()=>show(Number(range.value)));
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>show(positions[mode]+Number(b.dataset.step))));
  stage.addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaY)<1)return;const n=positions[mode],dir=Math.sign(e.deltaY);if((dir<0&&n===0)||(dir>0&&n===modes[mode]-1))return;e.preventDefault();const delta=Math.max(1,Math.min(5,Math.round(Math.abs(e.deltaY)/35)));show(n+dir*delta);},{passive:false});
  stage.addEventListener('keydown',e=>{let n=positions[mode];if(e.key==='ArrowRight'||e.key==='ArrowUp')n++;else if(e.key==='ArrowLeft'||e.key==='ArrowDown')n--;else if(e.key==='Home')n=0;else if(e.key==='End')n=modes[mode]-1;else return;e.preventDefault();show(n);});

  // Drag to scrub. The stage has always advertised this with cursor: ew-resize, but nothing
  // listened for a drag. touch-action stays pan-y so a vertical swipe still scrolls the page.
  let drag=null;
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,n:positions[mode],w:stage.clientWidth||1,moved:false};
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x;
    if(!drag.moved&&Math.abs(dx)<4)return;
    drag.moved=true;
    // one full stage width sweeps the whole sequence, which is the feel of a turntable
    show(drag.n+Math.round((dx/drag.w)*modes[mode]));
  });
  const endDrag=e=>{if(!drag||e.pointerId!==drag.id)return;try{stage.releasePointerCapture(drag.id);}catch(_){}drag=null;};
  stage.addEventListener('pointerup',endDrag);
  stage.addEventListener('pointercancel',endDrag);
  // click-through on the stage should not steal focus from the keyboard controls mid-drag
  stage.addEventListener('click',e=>{if(e.detail>0)e.preventDefault();});

  // No global scroll listener and no autoplay here. Only direct controls change frames.

  // ---- hero plate: the same sequence, turning on its own, very slowly.
  // A 135 degree sweep rather than a full turn: at 180 the case is a blank white
  // panel, which is a poor thing to land on in a hero. The full 360 is one scroll
  // away in the workbench. Every 3rd frame keeps the loop under 0.5MB, and it stops
  // on hover, off-screen, in a background tab, under reduced motion, and on save-data.
  const plate=document.querySelector('#hero-plate'), heroImg=document.querySelector('#hero-render'), heroAngle=document.querySelector('#hero-angle');
  if(plate&&heroImg&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!(navigator.connection&&navigator.connection.saveData)){
    const stride=3, arcDeg=135, arcFrames=arcDeg/5, every=420, warmCount=8;
    const frames=[];for(let d=0;d<=arcFrames;d+=stride)frames.push(d);
    const bank=new Map();let at=0,dir=1,ready=1,seen=false,held=false; // frame 0 is the preloaded src
    const idle=window.requestIdleCallback||(fn=>setTimeout(fn,200));
    idle(()=>frames.forEach(d=>{const p=path('turn',d),im=new Image();im.onload=im.onerror=()=>{ready++;};im.src=p;bank.set(p,im);}));
    const paintPlate=()=>{const d=frames[at];heroImg.src=path('turn',d);heroAngle.textContent=String(d*5).padStart(3,'0')+'\u00B0';};
    const tick=()=>{
      if(!seen||held||document.hidden||ready<Math.min(warmCount,frames.length))return;
      const im=bank.get(path('turn',frames[at+dir]));
      // wait for the next frame to be decoded before pointing the plate at it, or the
      // swap blanks the plinth for a frame and the turn reads as a flicker
      if(!im||!im.complete||!im.naturalWidth)return;
      at+=dir;
      if(at===frames.length-1||at===0)dir=-dir; // ease back rather than jump
      if(im.decode)im.decode().then(paintPlate).catch(paintPlate);else paintPlate();
    };
    setInterval(tick,every);
    if('IntersectionObserver' in window){
      new IntersectionObserver(es=>{seen=es[0].isIntersecting;},{threshold:.35}).observe(plate);
    }else seen=true;
    plate.addEventListener('pointerenter',()=>{held=true;});
    plate.addEventListener('pointerleave',()=>{held=false;});
  }

  function inspect(i){document.querySelectorAll('.part-select').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.part)===i)));document.querySelectorAll('.part').forEach((p,n)=>p.hidden=n!==i);document.querySelector('#part-counter').textContent=`${String(i+1).padStart(2,'0')} / 09`;}
  document.querySelectorAll('.part-select').forEach(b=>b.addEventListener('click',()=>inspect(Number(b.dataset.part))));
  document.querySelectorAll('[data-inspect]').forEach(a=>a.addEventListener('click',()=>{const i=Number(a.dataset.inspect);inspect(i);setTimeout(()=>document.querySelector(`[data-part="${i}"]`).focus({preventScroll:true}),0);}));
  const dialog=document.querySelector('#full-view'), mount=document.querySelector('#full-mount'), expand=document.querySelector('#expand'), originalParent=viewer.parentNode, nextSibling=viewer.nextSibling;let oldOverflow='';
  expand.addEventListener('click',()=>{oldOverflow=document.body.style.overflow;mount.appendChild(viewer);dialog.showModal();document.body.style.overflow='hidden';});
  function close(){dialog.close();}
  document.querySelector('#close-full').addEventListener('click',close);
  dialog.addEventListener('close',()=>{originalParent.insertBefore(viewer,nextSibling);document.body.style.overflow=oldOverflow;expand.focus({preventScroll:true});});

  // ---- theme: an explicit choice wins, otherwise follow the OS
  const root=document.documentElement, toggle=document.querySelector('#theme-toggle');
  const darkNow=()=>root.getAttribute('data-theme')==='dark'||(root.getAttribute('data-theme')!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
  function paintToggle(){const d=darkNow();toggle.setAttribute('aria-pressed',String(d));toggle.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme');}
  let saved=null;try{saved=localStorage.getItem('th-theme');}catch(_){}
  // Inside another site's frame (the Realm Systems exhibit) the page stays light unless the visitor picks dark.
  const framed=(()=>{try{return self!==top;}catch(_){return true;}})();
  if(saved)root.setAttribute('data-theme',saved);else if(framed)root.setAttribute('data-theme','light');else root.removeAttribute('data-theme');
  paintToggle();
  toggle.addEventListener('click',()=>{const d=!darkNow();root.setAttribute('data-theme',d?'dark':'light');try{localStorage.setItem('th-theme',d?'dark':'light');}catch(_){}paintToggle();});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',paintToggle);

  // ---- reading progress. The scroll timeline drives it where that exists; this is
  // the fallback for engines without it, batched into one frame per scroll burst.
  const bar=document.querySelector('#progress-bar');
  if(bar&&!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline: scroll()'))){
    let queued=false;
    const paint=()=>{const d=document.documentElement,span=d.scrollHeight-innerHeight;bar.style.transform='scaleX('+(span>0?Math.min(1,scrollY/span):0)+')';queued=false;};
    const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(paint);};
    addEventListener('scroll',queue,{passive:true});
    addEventListener('resize',queue,{passive:true});
    paint();
  }

  // ---- reveal on scroll; visible by default if the observer never runs
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const io=new IntersectionObserver((entries)=>{entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.06});
    document.querySelectorAll('.section-heading, .bench-grid, .brief-band, .commission-grid, footer').forEach(t=>{t.classList.add('reveal');io.observe(t);});
    document.querySelectorAll('.decision-list, .cost-split, .line-items').forEach(t=>{t.classList.add('stagger');io.observe(t);});
  }

  show(0);
})();
