/* Embedded Studio printing uses a top-level document, isolated from CRM iframe pagination. */
(() => {
  'use strict';
  window.THIS_INSTRUCTIONS_PRINT_WINDOW = function(target, html, title) {
    const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const styles=[...document.querySelectorAll('style,link[rel="stylesheet"]')].map(e=>e.outerHTML).join('\n');
    const finalStyles=`
      html,body{margin:0!important;padding:0!important;background:#e8eeeb!important}
      .this-print-toolbar{position:sticky;top:0;z-index:10000;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 20px;background:white;border-bottom:1px solid #d3e1da;font:14px Arial,sans-serif;color:#153e34}
      .this-print-toolbar>div{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.this-print-toolbar button{font:inherit;padding:11px 16px;border:1px solid #bacfc4;border-radius:7px;background:#fff;color:#174c3c;cursor:pointer}.this-print-toolbar button:first-child{background:#00574b;color:#fff}.this-print-toolbar button:disabled{opacity:.5;cursor:wait}
      #print-root{display:block!important;padding:20px 0!important;width:210mm!important;max-width:none!important;margin:auto!important;transform:none!important;zoom:1!important}
      #print-root .pdf-page{position:relative!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0 0 18px!important;box-sizing:border-box!important}
      #print-root .pdf-page:not(.pdf-cover){display:block!important;min-height:296mm!important}
      @media print{
        @page{size:A4;margin:0}
        html,body{display:block!important;width:210mm!important;min-width:210mm!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;background:white!important;transform:none!important;zoom:1!important}
        .this-print-toolbar{display:none!important}
        #print-root,#print-root .print-document{display:block!important;position:static!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;transform:none!important;zoom:1!important}
        #print-root .pdf-page{display:block!important;position:relative!important;box-sizing:border-box!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:296mm!important;min-height:296mm!important;max-height:296mm!important;overflow:hidden!important;margin:0!important;padding:0!important;transform:none!important;zoom:1!important;box-shadow:none!important;break-before:auto!important;break-inside:avoid!important;page-break-inside:avoid!important;break-after:page!important;page-break-after:always!important}
        #print-root .pdf-cover{display:grid!important;grid-template-rows:43% 31% 26%!important}
        #print-root .pdf-cover>*{box-sizing:border-box!important;min-height:0!important}
        #print-root .cover-footer{position:relative!important;height:100%!important;min-height:0!important}
        #print-root .cover-footer em{position:absolute!important;left:54px!important;right:54px!important;bottom:20px!important;margin:0!important}
        #print-root .page-footer{display:flex!important;position:absolute!important;left:58px!important;right:58px!important;bottom:23px!important;top:auto!important;height:auto!important;transform:none!important;break-inside:avoid!important}
        #print-root .print-document:last-child .pdf-page:last-child{break-after:auto!important;page-break-after:auto!important}
        #print-root *{text-shadow:none!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }`;
    target.document.open();
    target.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${esc(location.origin+'/')}"><title>${esc(title)}</title>${styles}<style id="this-isolated-print-rules">${finalStyles}</style></head><body class="${esc(document.body.className)} this-instructions-print-window"><header class="this-print-toolbar"><span id="this-print-status" role="status">Preparing document…</span><div><button type="button" id="this-instructions-print" disabled>Print / save PDF</button><button type="button" id="this-instructions-close">Close</button></div></header><main id="print-root" class="print-root">${html}</main></body></html>`);
    target.document.close();
    target.document.getElementById('this-instructions-close').addEventListener('click',()=>target.close());
    const button=target.document.getElementById('this-instructions-print');button.addEventListener('click',()=>{target.focus();target.print();});
    const assets=[...target.document.querySelectorAll('link[rel="stylesheet"]')].map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});}));
    const images=[...target.document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});}));
    Promise.race([Promise.all([...assets,...images,target.document.fonts?.ready||Promise.resolve()]),new Promise(resolve=>setTimeout(resolve,10000))]).then(()=>{
      if(target.closed)return;
      const count=target.document.querySelectorAll('.pdf-page').length;
      target.document.getElementById('this-print-status').textContent=`${count} document page${count===1?'':'s'} · A4 print layout ready`;
      button.disabled=false;
      target.requestAnimationFrame(()=>target.requestAnimationFrame(()=>{if(!target.closed){target.focus();target.print();}}));
    });
  };
})();
