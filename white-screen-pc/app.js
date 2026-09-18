'use strict';
(() => {
 const viewer=document.querySelector('#viewer'), stage=document.querySelector('#stage'), image=document.querySelector('#render'), range=document.querySelector('#frame-range'), count=document.querySelector('.frame-count'), tag=document.querySelector('.frame-tag'), error=document.querySelector('#media-error');
 const modes={turn:72,explode:48}, positions={turn:0,explode:0}; let mode='turn';
 const cache=new Map(); const path=(m,i)=>`frames/${m}_${String(i).padStart(3,'0')}.webp`;
 function warm(m,i){if(i<0||i>=modes[m])return;const p=path(m,i);if(!cache.has(p)){const im=new Image();im.src=p;cache.set(p,im);}}
 function show(i){positions[mode]=Math.max(0,Math.min(modes[mode]-1,Math.round(i)));const n=positions[mode];range.max=modes[mode]-1;range.value=n;range.setAttribute('aria-valuetext',`${mode==='turn'?'Rotation':'Explosion'} frame ${n+1} of ${modes[mode]}`);count.textContent=`${String(n+1).padStart(2,'0')} / ${modes[mode]}`;tag.textContent=`${mode.toUpperCase()} / ${String(n+1).padStart(3,'0')}`;image.src=path(mode,n);image.alt=mode==='turn'?`Original rendered white Thermalright A70 Vision build, rotation frame ${n+1} of 72`:`Original rendered build separating into components, explosion frame ${n+1} of 48`;for(let d=-3;d<=3;d++)warm(mode,n+d);}
 image.addEventListener('error',()=>{error.hidden=false;});image.addEventListener('load',()=>{error.hidden=true;});
 document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));show(positions[mode]);}));
 range.addEventListener('input',()=>show(Number(range.value)));
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>show(positions[mode]+Number(b.dataset.step))));
 stage.addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaY)<1)return;const n=positions[mode],dir=Math.sign(e.deltaY);if((dir<0&&n===0)||(dir>0&&n===modes[mode]-1))return;e.preventDefault();const delta=Math.max(1,Math.min(5,Math.round(Math.abs(e.deltaY)/35)));show(n+dir*delta);},{passive:false});
 stage.addEventListener('keydown',e=>{let n=positions[mode];if(e.key==='ArrowRight'||e.key==='ArrowUp')n++;else if(e.key==='ArrowLeft'||e.key==='ArrowDown')n--;else if(e.key==='Home')n=0;else if(e.key==='End')n=modes[mode]-1;else return;e.preventDefault();show(n);});
 // No global scroll listener and no autoplay. Only direct controls change frames.
 function inspect(i){document.querySelectorAll('.part-select').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.part)===i)));document.querySelectorAll('.part').forEach((p,n)=>p.hidden=n!==i);document.querySelector('#part-counter').textContent=`${String(i+1).padStart(2,'0')} / 09`;}
 document.querySelectorAll('.part-select').forEach(b=>b.addEventListener('click',()=>inspect(Number(b.dataset.part))));
 document.querySelectorAll('[data-inspect]').forEach(a=>a.addEventListener('click',()=>{const i=Number(a.dataset.inspect);inspect(i);setTimeout(()=>document.querySelector(`[data-part="${i}"]`).focus({preventScroll:true}),0);}));
 const dialog=document.querySelector('#full-view'), mount=document.querySelector('#full-mount'), expand=document.querySelector('#expand'), originalParent=viewer.parentNode, nextSibling=viewer.nextSibling;let oldOverflow='';
 expand.addEventListener('click',()=>{oldOverflow=document.body.style.overflow;mount.appendChild(viewer);dialog.showModal();document.body.style.overflow='hidden';});
 function close(){dialog.close();}
 document.querySelector('#close-full').addEventListener('click',close);
 dialog.addEventListener('close',()=>{originalParent.insertBefore(viewer,nextSibling);document.body.style.overflow=oldOverflow;expand.focus({preventScroll:true});});
 show(0);
})();
