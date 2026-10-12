(function(){'use strict';
 const storageKey='pienosmart-layout-choice-v1',button=document.getElementById('pienosmart-view-toggle');
 if(!button)return;
 const isNarrow=()=>window.matchMedia('(max-width:760px)').matches;
 let choice='mobile';
 try{choice=localStorage.getItem(storageKey)==='desktop'?'desktop':'mobile'}catch{}
 function render(){
   const desktop=choice==='desktop'&&!isNarrow();
   document.body.classList.toggle('ps-mobile-view',!desktop);
   document.body.classList.toggle('ps-desktop-view',desktop);
   button.textContent=desktop?'📱 Vista smartphone':'🖥️ Vista computer';
   button.setAttribute('aria-label',desktop?'Passa alla vista smartphone':'Passa alla vista computer');
   button.setAttribute('aria-pressed',String(desktop));
   if(desktop)document.querySelector('.sidebar')?.classList.remove('open');
   window.dispatchEvent(new Event('resize'));
 }
 button.addEventListener('click',()=>{choice=choice==='desktop'?'mobile':'desktop';try{localStorage.setItem(storageKey,choice)}catch{}render()});
 window.addEventListener('resize',()=>{const desktop=choice==='desktop'&&!isNarrow();document.body.classList.toggle('ps-mobile-view',!desktop);document.body.classList.toggle('ps-desktop-view',desktop);button.textContent=desktop?'📱 Vista smartphone':'🖥️ Vista computer'});
 render();
})();