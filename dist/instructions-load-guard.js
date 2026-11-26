(() => {
  let ready=false,failed=false,received=false,recordId='',timer;
  const post=(type,extra={})=>{if(parent!==window)parent.postMessage({source:'this-instructions-studio',type,instructionSetId:recordId,...extra},location.origin);};
  const set=(name,text)=>{const n=document.getElementById(name);if(n)n.textContent=text;};
  function fail(message='The document could not finish loading. Reload Studio to try again. Your saved draft has not been replaced.') {
    ready=false;failed=true;clearTimeout(timer);document.documentElement.classList.remove('instructions-load-ready');document.documentElement.classList.add('instructions-load-failed');
    const show=()=>{set('instructions-load-heading','Instructions could not be opened');set('instructions-load-detail',message);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
    post('THIS_STUDIO_LOAD_FAILED',{message});
  }
  window.THIS_INSTRUCTIONS_LOAD={
    isReady:()=>ready&&!failed,
    begin(payload){ready=false;failed=false;received=true;recordId=String(payload.instructionSet?.id||'');clearTimeout(timer);document.documentElement.classList.remove('instructions-load-ready','instructions-load-failed');set('instructions-load-heading','Opening your instructions');set('instructions-load-detail','Loading the saved document. Editing and saving will become available when it is ready.');timer=setTimeout(()=>fail(),15000);},
    ready(){if(failed||parent!==window&&!received)return false;if(ready)return true;ready=true;clearTimeout(timer);document.documentElement.classList.add('instructions-load-ready');post('THIS_STUDIO_INITIALISED',{builderReady:true});return true;},
    fail
  };
  addEventListener('error',event=>{if(!ready&&(event.target===window||event.target?.tagName==='SCRIPT'))fail();},true);
  addEventListener('unhandledrejection',()=>{if(!ready)fail();});
  addEventListener('keydown',event=>{if(!ready&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p'){event.preventDefault();event.stopImmediatePropagation();}},true);
  addEventListener('click',event=>{
    if(event.target.closest('#instructions-load-retry')){if(parent!==window)post('THIS_STUDIO_RELOAD_REQUEST');else location.reload();return;}
    if(!ready&&event.target.closest('#save-draft,#publish-pack,#confirm-publish,#print-pack')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
})();
