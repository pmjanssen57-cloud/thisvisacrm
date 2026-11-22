/* THiS CRM v0.18.13: light-touch Instructions Studio workflow, no draft schema change. */
(() => {
  'use strict';
  const ROOT_ID = 'ib72';
  const PREF_KEY = 'this-instructions-editor-mode-v01813';
  let mode = 'basic';
  try { mode = localStorage.getItem(PREF_KEY) === 'advanced' ? 'advanced' : 'basic'; } catch {}
  let activeSetup = null;
  let scheduled = false;
  let pendingCopy = false;
  let saveTimer = null;
  let userTouched = false;

  const q = (selector, root=document) => root.querySelector(selector);
  const setMode = (next) => {
    mode = next === 'advanced' ? 'advanced' : 'basic';
    document.body.classList.toggle('this-basic-v01813', mode === 'basic');
    document.body.classList.toggle('this-advanced-v01813', mode === 'advanced');
    try { localStorage.setItem(PREF_KEY, mode); } catch {}
    document.querySelectorAll('[data-this-mode-v01813]').forEach(button => {
      const selected = button.dataset.thisModeV01813 === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
    });
    // Returning from advanced pack settings must not leave a hidden selected tab.
    if (mode === 'basic' && q('.editor-tab[data-tab="pack"].active')) {
      q('.editor-tab[data-tab="content"]')?.click();
    }
  };

  const changeStartingCategory = (category) => {
    const select = q('#ib72-category');
    if (!select) return;
    if (select.value === category) return;
    select.value = category;
    select.dispatchEvent(new Event('change', {bubbles:true}));
  };

  const runStart = (action) => {
    if (action !== 'copy') pendingCopy = false;
    if (action === 'standard') {
      const selector = q('#ib72-category');
      if (selector?.value === 'blank') {
        // The existing category-change handler confirms before replacing draft content.
        changeStartingCategory('smc');
      } else {
        selector?.focus();
        selector?.scrollIntoView({block:'nearest',behavior:'smooth'});
      }
      return;
    }
    if (action === 'blank') {
      changeStartingCategory('blank');
      return;
    }
    if (action === 'copy') {
      if (q('#ib72-category')?.value === 'blank') {
        q('#ib110-duplicate')?.click();
      } else {
        // The existing builder's duplicate workflow is available in the blank pack.
        // The confirmation in category change protects unsaved content.
        pendingCopy = true;
        changeStartingCategory('blank');
        // When the existing confirmation succeeds and the builder re-renders,
        // open the copied-guide selector without another click.
      }
      return;
    }
  };

  const decorate = () => {
    const root = q('#'+ROOT_ID);
    const setup = root && q('.ib72-setup',root);
    if (!setup || setup === activeSetup) return;
    activeSetup = setup;
    const intro = q('.ib72-setup-title',root);
    if (intro) {
      intro.querySelector('h1')?.replaceChildren(document.createTextNode('Create client instructions'));
      const copy = intro.querySelector('p');
      if (copy) copy.textContent = 'Choose a starting point, tailor the wording, then review the finished guide.';
    }
    const quick = document.createElement('div');
    quick.className = 'this-start-and-mode-v01813';
    quick.innerHTML = `
      <div class="this-start-v01813" aria-label="Starting options">
        <span class="this-overline-v01813">Start or switch guide</span>
        <div class="this-start-buttons-v01813">
          <button type="button" data-this-start-v01813="standard"><strong>Standard template</strong><small>Use a familiar visa guide</small></button>
          <button type="button" data-this-start-v01813="copy"><strong>Copy an existing guide</strong><small>Use it as your starting point</small></button>
          <button type="button" data-this-start-v01813="blank"><strong>Start from scratch</strong><small>Branded blank instructions</small></button>
        </div>
      </div>
      <div class="this-mode-v01813" role="group" aria-label="Editor complexity">
        <span class="this-overline-v01813">Editing options</span>
        <div class="this-mode-buttons-v01813">
          <button type="button" data-this-mode-v01813="basic" aria-pressed="false">Basic</button>
          <button type="button" data-this-mode-v01813="advanced" aria-pressed="false">Advanced</button>
        </div>
        <small>Full controls remain available in Advanced.</small>
      </div>`;
    // Keep the existing category and client-name selector immediately below quick start.
    setup.insertBefore(quick,setup.querySelector('.ib72-two-fields'));
    quick.querySelectorAll('[data-this-start-v01813]').forEach(b=>b.addEventListener('click',()=>runStart(b.dataset.thisStartV01813)));
    quick.querySelectorAll('[data-this-mode-v01813]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.thisModeV01813)));

    const bar = q('.ib72-document-bar',root);
    if (bar && !q('#this-review-cta-v01813',bar)) {
      const review = document.createElement('button');
      review.type='button'; review.id='this-review-cta-v01813';
      review.className='button button-primary'; review.textContent='Review before issue';
      review.title='Review the document and check outstanding items before marking it ready';
      review.addEventListener('click',()=>{
        const issues = q('#ib72-review',root);
        if (issues && !issues.hidden && issues.textContent.trim()) {
          issues.scrollIntoView({block:'center',behavior:'smooth'});
          issues.classList.remove('this-review-pulse-v01813');
          void issues.offsetWidth;
          issues.classList.add('this-review-pulse-v01813');
          return;
        }
        // Reuse existing output review rather than implementing competing validation.
        q('#ib72-settings-open')?.click();
      });
      bar.appendChild(review);
    }
    const reviewBanner = q('#ib72-review',root);
    if (reviewBanner) reviewBanner.setAttribute('aria-label','Outstanding issues to check');
    setMode(mode);
    if (pendingCopy && q('#ib72-category')?.value === 'blank' && q('#ib110-duplicate')) {
      pendingCopy = false;
      q('#ib110-duplicate').click();
    }
  };

  function scheduleDecorate(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(()=>{scheduled=false;decorate();});
  }
  const observer = new MutationObserver((changes)=>{
    if (changes.some(m=>m.type==='childList' && ([...m.addedNodes].some(node=>
      node.nodeType===1 && (node.id==='ib72' || node.matches?.('.ib72-setup') || node.querySelector?.('.ib72-setup')))))) {
      scheduleDecorate();
    }
  });
  function scheduleSafeAutosave(event) {
    if (!event.isTrusted || !event.target.closest?.('#ib72')) return;
    // Only actual adviser edits, never initial template hydration or received CRM data.
    if (!window.THIS_INSTRUCTIONS_LOAD?.isReady()) return;
    if (event.type === 'click' && !event.target.closest('button')) return;
    userTouched = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!userTouched || !window.THIS_INSTRUCTIONS_LOAD?.isReady() ||
          document.documentElement.classList.contains('instructions-load-failed')) return;
      if (document.querySelector('dialog[open], .module-modal-v01743:not([hidden])')) return;
      const status = q('#save-status')?.textContent || '';
      if (!/not saved|unsaved/i.test(status)) return;
      const save = q('#save-draft');
      if (!save || save.disabled) return;
      userTouched = false;
      save.click(); // Use the existing CRM snapshot workflow and its error handling.
    }, 6500);
  }
  function init(){
    setMode(mode);
    decorate();
    const workspace = q('.workspace');
    if (workspace) observer.observe(workspace,{subtree:true,childList:true});
    document.addEventListener('input', scheduleSafeAutosave, true);
    document.addEventListener('change', scheduleSafeAutosave, true);
    document.addEventListener('click', scheduleSafeAutosave, true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
