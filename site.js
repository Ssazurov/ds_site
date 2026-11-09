(function(){
var d=document.querySelector('details.more');
if(d){document.addEventListener('keydown',function(e){if(e.key==='Escape'&&d.open){d.open=false;d.querySelector('summary').focus();}});
document.addEventListener('click',function(e){if(d.open&&!d.contains(e.target))d.open=false;});}
window.addEventListener('load',function(){
var s=document.getElementById('shots');if(!s)return;var n=0;
s.querySelectorAll('img').forEach(function(i){if(i.naturalWidth===0){i.closest('figure').hidden=true;}else{n++;}});
if(!n)s.hidden=true;});
})();
