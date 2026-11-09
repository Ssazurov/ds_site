(function(){
var d=document.querySelector('details.more');
if(d){document.addEventListener('keydown',function(e){if(e.key==='Escape'&&d.open){d.open=false;d.querySelector('summary').focus();}});
document.addEventListener('click',function(e){if(d.open&&!d.contains(e.target))d.open=false;});}
window.addEventListener('load',function(){
var s=document.getElementById('shots');if(!s)return;var n=0;
s.querySelectorAll('img').forEach(function(i){if(i.naturalWidth===0){i.closest('figure').hidden=true;}else{n++;}});
if(!n)s.hidden=true;});
})();
(function(){
var f=document.querySelector('footer');if(!f)return;
fetch('releases.json',{cache:'no-cache'}).then(function(r){return r.json();}).then(function(j){
var a=(j.releases||j||[]).slice();if(!a.length)return;
function key(v){return String(v).split('.').map(Number);}
a.sort(function(x,y){var p=key(x.version),q=key(y.version);for(var i=0;i<3;i++){if((p[i]||0)!==(q[i]||0))return(q[i]||0)-(p[i]||0);}return 0;});
var r=a[0],d=String(r.date||'').split('-');
var s=document.createElement('span');s.className='build-version';
s.textContent=' · Версия '+r.version+(r.build?' ('+r.build+')':'')+(d.length===3?' от '+d[2]+'.'+d[1]+'.'+d[0]:'');
f.appendChild(s);
}).catch(function(){});
})();
