export const WEBSITE_URL = 'https://turner-hopkins-website-mirror.turnerhopkin-7332.chatgpt.site';
export const CRM_ORIGIN = 'https://thisvisacrm.netlify.app';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function canonicalJson(value) { if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';return JSON.stringify(value); }
export function contentError(message, statusCode=400) { const e=new Error(message); e.statusCode=statusCode; return e; }
export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function publicUrl(value='', image=false) {
 const s=String(value).trim(); if(!s)return '';
 if(/^\/mirror-(?:assets|shared)\/[a-z0-9.-]+$/i.test(s))return s;
 try { const u=new URL(s); if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;
  if(!image&&['mailto:','tel:'].includes(u.protocol))return s;
 } catch {} return '';
}
export function normaliseArticle(input={}, {publish=false}={}) {
 const text=(key,max)=>String(input[key]??'').replace(/\u0000/g,'').trim().slice(0,max);
 const article={title:text('title',180),slug:text('slug',100),summary:text('summary',600),body:text('body',150000),author:text('author',120),publicationDate:text('publicationDate',10),categories:[...new Set((Array.isArray(input.categories)?input.categories:[]).map(x=>String(x).trim().slice(0,70)).filter(Boolean))].slice(0,12),imageUrl:publicUrl(text('imageUrl',2000),true),imageAlt:text('imageAlt',240),seoTitle:text('seoTitle',180),seoDescription:text('seoDescription',320)};
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug))throw contentError('Use a URL name containing lower-case words separated by hyphens.');
 if(!article.title)throw contentError('Enter an article title.');
 if(new TextEncoder().encode(article.body).length>150000)throw contentError('The article text is too large. Shorten it before saving.');
 if(input.imageUrl&&!article.imageUrl)throw contentError('Use an HTTPS image URL or an existing mirrored image.');
 if(article.publicationDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(article.publicationDate)||Number.isNaN(Date.parse(article.publicationDate))||new Date(article.publicationDate).toISOString().slice(0,10)!==article.publicationDate))throw contentError('Enter a valid publication date.');
 if(publish&&(!article.body||!article.author||!article.publicationDate))throw contentError('Add the article text, author and publication date before publishing.');
 if(publish&&article.imageUrl&&!article.imageAlt)throw contentError('Add alternative text for the article image.');
 return article;
}
function inline(text) {
 const pattern=/\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;let out='',last=0;
 for(const m of text.matchAll(pattern)) {out+=escapeHtml(text.slice(last,m.index));
  if(m[1])out+='<strong>'+escapeHtml(m[1])+'</strong>';
  else {const url=publicUrl(m[3]);out+=url?'<a href="'+escapeHtml(url)+'" rel="noopener">'+escapeHtml(m[2])+'</a>':escapeHtml(m[0]);}last=m.index+m[0].length;
 }return out+escapeHtml(text.slice(last));
}
export function renderBody(markdown='') {
 const lines=String(markdown).replace(/\r/g,'').split('\n');let out='',paragraph=[],list=[],quote=[];
 const flush=()=>{if(paragraph.length){out+='<p>'+inline(paragraph.join(' '))+'</p>';paragraph=[];}if(list.length){out+='<ul>'+list.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>';list=[];}if(quote.length){out+='<blockquote><p>'+inline(quote.join(' '))+'</p></blockquote>';quote=[];}};
 for(const line of lines){const h=line.match(/^(#{1,4})\s+(.+)$/),li=line.match(/^\s*[-*]\s+(.+)$/),q=line.match(/^>\s?(.*)$/);
  if(!line.trim()){flush();continue;}if(h){flush();const level=Math.max(2,h[1].length);out+=`<h${level}>${inline(h[2])}</h${level}>`;}
  else if(li){if(paragraph.length||quote.length)flush();list.push(li[1]);}
  else if(q){if(paragraph.length||list.length)flush();quote.push(q[1]);}
  else {if(list.length||quote.length)flush();paragraph.push(line.trim());}
 }flush();return out;
}
export function articleMarkup(a) {
 return `<article class="this-web-article"><header><p class="this-web-kicker">New Zealand immigration news</p><h1>${escapeHtml(a.title)}</h1><p class="this-web-meta">${escapeHtml(a.publicationDate)} · ${escapeHtml(a.author)}</p>${a.summary?'<p class="this-web-summary">'+escapeHtml(a.summary)+'</p>':''}${a.categories.length?'<p class="this-web-categories">'+a.categories.map(escapeHtml).join(' · ')+'</p>':''}</header>${a.imageUrl?'<img class="this-web-hero" src="'+escapeHtml(a.imageUrl)+'" alt="'+escapeHtml(a.imageAlt)+'">':''}<div class="this-web-body">${renderBody(a.body)}</div><footer><a href="/news">All immigration news</a><a href="/contact">Contact the team</a></footer></article>`;
}
export const articleCss=`.this-web-article,.this-web-news{max-width:1000px;margin:auto;padding:64px 28px 90px;color:#042d2d}.this-web-article h1,.this-web-news h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.12;margin:12px 0 20px}.this-web-kicker{font-size:1rem;text-transform:uppercase;letter-spacing:.09em}.this-web-meta,.this-web-categories{font-size:1rem;color:#466761}.this-web-summary{font-size:1.3rem;line-height:1.6}.this-web-hero{width:100%;max-height:520px;object-fit:cover;border-radius:10px;margin:28px 0}.this-web-body{font-size:1.15rem;line-height:1.8;max-width:800px;margin:30px auto}.this-web-body p{margin:0 0 1.3em}.this-web-body h2,.this-web-body h3,.this-web-body h4{line-height:1.3;margin:2em 0 .7em}.this-web-body a{text-decoration:underline}.this-web-body blockquote{border-left:4px solid #84bea8;padding:10px 24px;margin:28px 0;background:#f1f8f4}.this-web-article footer{display:flex;gap:24px;border-top:1px solid #b9cec6;padding-top:26px}.this-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.this-news-card{border:1px solid #c1d8ce;border-radius:10px;overflow:hidden;background:white}.this-news-card img{width:100%;height:210px;object-fit:cover}.this-news-card>div{padding:24px}.this-news-card h2{font-size:1.5rem;line-height:1.3;margin:8px 0 16px}.this-news-card p{font-size:1rem;line-height:1.65}.this-news-card a{text-decoration:none}.this-news-pagination{display:flex;gap:20px;align-items:center;margin-top:30px}.this-web-search{display:flex;gap:10px;margin:28px 0}.this-web-search input{width:100%;padding:12px;border:1px solid #6b8d81;border-radius:6px;font:inherit}.this-web-search button,.this-news-pagination a{padding:12px 20px;border:0;border-radius:6px;background:#042d2d;color:white;font:inherit}@media(max-width:640px){.this-news-grid{grid-template-columns:1fr}.this-web-article,.this-web-news{padding:36px 20px 70px}.this-web-body{font-size:1.05rem}}`;

export const articleHeaderCss = `.this-web-article,.this-web-news{padding-top:calc(var(--header-height,130px) + 36px)}@media(max-width:640px){.this-web-article,.this-web-news{padding-top:calc(var(--header-height,96px) + 24px)}}`;
