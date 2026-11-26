/* Shared editing navigation. This file never changes document state or acceptance rules. */
(() => {
  'use strict';
  function init() {
    if (new URLSearchParams(location.search).has('token') || document.body.classList.contains('public-review-mode')) return;
    const agreement = Boolean(document.getElementById('sectionList'));
    const top = document.querySelector('.topbar');
    if (!top || document.querySelector('.calm-studio-toolbar')) return;
    document.body.classList.add('calm-studio');
    const toolbar = document.createElement('div');
    toolbar.className = 'calm-studio-toolbar';
    toolbar.innerHTML = '<div class="calm-studio-modes" role="group" aria-label="Document workspace view"><button type="button" data-calm-mode="sections">Sections</button><button type="button" data-calm-mode="edit">Edit</button><button type="button" data-calm-mode="split">Split view</button><button type="button" data-calm-mode="preview">Preview</button></div><button type="button" class="calm-studio-next">Next step →</button>';
    top.insertAdjacentElement('afterend', toolbar);
    const storageKey = `this_ui46:studio-mode:${agreement ? 'agreement' : 'instructions'}`;
    function mode(value) {
      document.body.classList.remove('calm-mode-edit', 'calm-mode-preview', 'calm-mode-split', 'calm-mode-sections');
      document.body.classList.add(`calm-mode-${value}`);
      toolbar.querySelectorAll('[data-calm-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.calmMode === value)));
      try { sessionStorage.setItem(storageKey, value); } catch {}
      window.dispatchEvent(new Event('resize'));
    }
    let initial = innerWidth > 1180 ? 'split' : 'edit';
    try { const saved = sessionStorage.getItem(storageKey); if (['edit','split','preview'].includes(saved)) initial = saved; } catch {}
    if (initial === 'split' && innerWidth <= 1180) initial = 'edit';
    mode(initial);
    toolbar.querySelectorAll('[data-calm-mode]').forEach(button => button.addEventListener('click', () => mode(button.dataset.calmMode)));
    document.querySelector(agreement?'.left':'.pack-panel')?.addEventListener('click',event=>{
      if(innerWidth<=720 && event.target.closest('[data-section-select],.document-item,[data-doc]') && !event.target.matches('input')) requestAnimationFrame(()=>mode('edit'));
    });
    const tabs = document.querySelector(agreement ? '.tabs' : '.editor-tabs');
    if (agreement && tabs) {
      const labels = {matter:'Client & matter',content:'Content',fees:'Fees',signing:'Review & send',template:'Templates'};
      ['matter','content','fees','signing','template'].forEach(key => {
        const tab = tabs.querySelector(`[data-tab="${key}"]`);
        if (tab) { tab.textContent = labels[key]; tabs.appendChild(tab); }
      });
    }
    const next = toolbar.querySelector('.calm-studio-next');
    const availableTabs = () => [...(tabs?.querySelectorAll('[data-tab]') || [])].filter(tab => tab.getClientRects().length && !tab.disabled && tab.dataset.tab !== 'template');
    function updateStep() {
      const items = availableTabs();
      const index = items.findIndex(tab => tab.classList.contains('active'));
      next.textContent = index >= 0 && index < items.length - 1 ? `Next: ${items[index+1].textContent.trim()} →` : 'Review document →';
    }
    next.addEventListener('click', () => {
      const items = availableTabs();
      const index = items.findIndex(tab => tab.classList.contains('active'));
      if (index >= 0 && index < items.length - 1) { mode('edit'); items[index+1].click(); document.querySelector(agreement ? '.editor' : '.editor-panel')?.scrollTo({top:0}); }
      else mode('preview');
      updateStep();
    });
    tabs?.addEventListener('click', () => setTimeout(updateStep, 0));
    updateStep();
    const actions=top.querySelector('.top-actions') || top.querySelector('.actions') || top.lastElementChild;
    const secondary=[...actions.querySelectorAll('button')].filter(button=>/^(Template library|Export data)$/i.test(button.textContent.trim()));
    if(secondary.length){
      const more=document.createElement('details'); more.className='calm-studio-more';
      const summary=document.createElement('summary'); summary.textContent='More';
      const list=document.createElement('div'); more.append(summary,list);
      secondary.forEach(button=>list.appendChild(button)); actions.appendChild(more);
    }
    // Use the existing save control and its existing CRM snapshot listener.
    if(!agreement){const save=document.getElementById('save-draft');const issue=document.getElementById('publish-pack');if(save&&issue){actions.insertBefore(save,issue);}}
    let fitFrame;
    function fitPreview(){
      cancelAnimationFrame(fitFrame);
      fitFrame=requestAnimationFrame(()=>{
        const scroller=document.querySelector(agreement?'.previewcanvas':'.preview-scroller');
        const preview=document.getElementById(agreement?'pages':'preview-root');
        const paper=preview?.querySelector(agreement?'.a4':'.pdf-page');
        if(!scroller||!preview||!paper||!scroller.clientWidth)return;
        const style=getComputedStyle(scroller);
        const available=scroller.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
        preview.style.setProperty('--calm-preview-scale',String(Math.min(1,available/paper.offsetWidth)));
      });
    }
    const scroller=document.querySelector(agreement?'.previewcanvas':'.preview-scroller');
    if(scroller){new ResizeObserver(fitPreview).observe(scroller);new MutationObserver(fitPreview).observe(scroller,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
    window.addEventListener('resize',fitPreview);fitPreview();
    // Friendly text editing backed by the builder's original textarea/state handlers.
    const source=agreement&&document.getElementById('sectionBodyInput');
    if(source){
      function safeRichText(html){
        const template=document.createElement('template');template.innerHTML=html;
        const allowed=new Set(['P','BR','STRONG','B','EM','I','UL','OL','LI','H3','H4','BLOCKQUOTE','A','SPAN']);
        [...template.content.querySelectorAll('*')].forEach(element=>{
          if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED'].includes(element.tagName)){element.remove();return;}
          if(!allowed.has(element.tagName)){element.replaceWith(...element.childNodes);return;}
          [...element.attributes].forEach(attribute=>{if(element.tagName==='A'&&attribute.name==='href'&&/^(https?:|mailto:)/i.test(attribute.value))return;element.removeAttribute(attribute.name);});
        });return template.innerHTML;
      }
      const tools=document.createElement('div');tools.className='calm-richtext-toolbar';tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Section wording formatting');
      const editor=document.createElement('div');editor.className='calm-richtext-editor';editor.contentEditable='true';editor.setAttribute('role','textbox');editor.setAttribute('aria-label','Section wording');editor.setAttribute('aria-multiline','true');
      [['bold','Bold'],['italic','Italic'],['insertUnorderedList','Bullet list']].forEach(([command,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label);button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{editor.focus();document.execCommand(command);editor.dispatchEvent(new Event('input'));});tools.appendChild(button);});
      source.hidden=true;source.insertAdjacentElement('afterend',tools);tools.insertAdjacentElement('afterend',editor);
      const help=editor.parentElement.querySelector('.help');if(help&&/HTML/.test(help.textContent))help.textContent='Select text to format it. Changes appear in the preview.';
      function sync(){if(!editor.contains(document.activeElement)&&document.activeElement!==editor){const html=safeRichText(source.value);if(editor.innerHTML!==html)editor.innerHTML=html;}editor.contentEditable=String(!source.disabled&&!source.readOnly);tools.querySelectorAll('button').forEach(button=>button.disabled=source.disabled||source.readOnly);}
      editor.addEventListener('input',()=>{source.value=safeRichText(editor.innerHTML);source.dispatchEvent(new Event('input',{bubbles:true}));});
      editor.addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});
      document.addEventListener('click',()=>requestAnimationFrame(sync));window.addEventListener('message',()=>requestAnimationFrame(sync));
      const heading=document.getElementById('sectionTitleHeading');if(heading)new MutationObserver(sync).observe(heading,{childList:true,subtree:true,characterData:true});
      new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['disabled','readonly']});sync();
    }
    // A public acceptance response can arrive asynchronously. Keep that view unchanged.
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('public-review-mode')) {
        document.body.classList.remove('calm-studio','calm-mode-edit','calm-mode-preview','calm-mode-split');
        toolbar.remove(); observer.disconnect();
      }
    });
    observer.observe(document.body, {attributes:true, attributeFilter:['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
