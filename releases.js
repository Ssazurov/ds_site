(function(){
var el=document.getElementById('rel');if(!el)return;
var mode=el.getAttribute('data-mode');
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function key(v){return v.split('.').map(Number);}
function cmp(a,b){var x=key(a.version),y=key(b.version);for(var i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(y[i]||0)-(x[i]||0);}return 0;}
function fmt(d){var p=String(d).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:esc(d);}
function notes(t){var l=String(t||'').split('\n').map(function(s){return s.replace(/^\s*[-*]\s*/,'').trim();}).filter(Boolean);
return l.length?'<ul>'+l.map(function(s){return'<li>'+esc(s)+'</li>';}).join('')+'</ul>':'';}
var local=/^(localhost|127\.|192\.168\.)/.test(location.hostname);
function url(r){return local?(r.apk_url||r.gh_apk_url):(r.gh_apk_url||r.apk_url);}
function apk(r){return url(r)?'<p><a class="btn" href="'+esc(url(r))+'">Скачать APK '+esc(r.version)+(r.size_mb?' ('+esc(r.size_mb)+' МБ)':'')+'</a></p>'+
(r.sha256?'<p class="note">SHA-256: <code>'+esc(r.sha256)+'</code></p>':''):'';}
fetch('releases.json',{cache:'no-cache'}).then(function(x){return x.json();}).then(function(d){
var rs=(d.releases||[]).slice().sort(cmp);
if(!rs.length){el.innerHTML='<p>Версий пока нет.</p>';return;}
var r=rs[0];
el.innerHTML='<h2>Версия '+esc(r.version)+(r.build?' ('+esc(r.build)+')':'')+' <small>от '+fmt(r.date)+'</small></h2>'+apk(r)+notes(r.notes)+
(rs.length>1?'<details id="versions" class="rel-old"><summary><strong>Прежние версии ('+(rs.length-1)+')</strong></summary>'+rs.slice(1).map(function(o){return'<section class="rel-sec"><h3>'+esc(o.version)+(o.build?' ('+esc(o.build)+')':'')+' <small>от '+fmt(o.date)+'</small></h3>'+notes(o.notes)+'</section>';}).join('')+'</details>':'');
}).catch(function(){el.innerHTML='<p>Не удалось загрузить список версий. Откройте <a href="https://www.rustore.ru/catalog/app/ru.ds.ds_app">RuStore</a>.</p>';});
})();
