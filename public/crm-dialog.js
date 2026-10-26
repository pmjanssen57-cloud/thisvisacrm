(() => {
  if (window.THIS_DIALOG) return;
  const queue = [];
  let active = null;
  const confirm = (options = {}) => new Promise(resolve => {
    queue.push({ options: typeof options === 'string' ? { message: options } : options, resolve });
    if (!active) showNext();
  });
  function showNext() {
    if (active || !queue.length) return;
    const request = queue.shift(), options = request.options;
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'this-crm-confirm';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'this-crm-confirm-title');
    dialog.setAttribute('aria-describedby', 'this-crm-confirm-message');
    const header = document.createElement('header');
    const eyebrow = document.createElement('span'); eyebrow.className='this-confirm-eyebrow'; eyebrow.textContent=options.eyebrow||'THiS CRM';
    const title = document.createElement('h2'); title.id='this-crm-confirm-title'; title.textContent=options.title||'Please confirm';
    header.append(eyebrow,title);
    const body=document.createElement('div'); body.className='this-confirm-body';
    const message=document.createElement('p'); message.id='this-crm-confirm-message'; message.textContent=options.message||'Continue?'; body.append(message);
    if(Array.isArray(options.details)&&options.details.length){const list=document.createElement('ul'); for(const detail of options.details.filter(Boolean)){const item=document.createElement('li');item.textContent=String(detail);list.append(item);}body.append(list);}
    const footer=document.createElement('footer');
    const cancel=document.createElement('button');cancel.type='button';cancel.className='this-confirm-cancel';cancel.textContent=options.cancelLabel||'Cancel';cancel.autofocus=true;
    const accept=document.createElement('button');accept.type='button';accept.className='this-confirm-accept';accept.textContent=options.confirmLabel||'Confirm';
    if(options.tone==='danger'||/discard|delete|remove|reset/i.test(options.message||''))accept.classList.add('danger');
    footer.append(cancel,accept);dialog.append(header,body,footer);
    let settled=false;
    function finish(value){
      if(settled)return;settled=true;
      document.removeEventListener('keydown',escape,true);
      dialog.close();dialog.remove();active=null;
      if(previous?.isConnected)previous.focus({preventScroll:true});
      request.resolve(value);queueMicrotask(showNext);
    }
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(false);}};
    cancel.addEventListener('click',()=>finish(false));accept.addEventListener('click',()=>finish(true));
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
    dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))finish(false);});
    active=dialog;document.body.append(dialog);document.addEventListener('keydown',escape,true);dialog.showModal();cancel.focus();
  }
  window.THIS_DIALOG = Object.freeze({ confirm });
})();
