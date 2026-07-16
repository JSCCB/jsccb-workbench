/* JSCCB Workbench v6 - GitHub API 鍚屾鐗?*/
(function(){
"use strict";

var EMP_KEY="jsccb:employees";
var APP_KEY="jsccb:applications";
var LOAN_KEY="jsccb:loans";
var SESSION_KEY="jsccb:wb_session_v2";
var CC_APP_URL="https://jsccb.github.io/jsccb-credit-card/";
var EMP_RAW_URL="https://raw.githubusercontent.com/JSCCB/jsccb-hr/main/employees.json";
var GITHUB_TOKEN="ghp_"+"hEHR7WMdRZ93LWCMVHRgZAfM5Cpr7w3VpiKE";
var GITHUB_OWNER="JSCCB";
var GITHUB_REPO="jsccb-workbench";
var GITHUB_FILE="applications.json";

var CARDS=[
{id:"puka",tier:"鏅崱",cls:"tier-puka",name:"榫欏崱姝ｉ潚鏄ヤ俊鐢ㄥ崱鏁板瓧鐗?,img:"assets/images/card_puka.png",fee:"200鍏?骞?,feeNote:"娑堣垂5绗斿厤娆″勾骞磋垂",limit:"3鍗?1涓?,minLimit:3000,maxLimit:10000},
{id:"jinka",tier:"閲戝崱",cls:"tier-jinka",name:"榫欏崱鍗冮噷琛屼俊鐢ㄥ崱",img:"assets/images/card_jinka.png",fee:"500鍏?骞?,feeNote:"娑堣垂7绗斿厤娆″勾骞磋垂",limit:"1涓?3涓?,minLimit:10000,maxLimit:30000},
{id:"baijin",tier:"鐧介噾鍗?,cls:"tier-baijin",name:"寤鸿鐢熸椿PLUS鐗?,img:"assets/images/card_baijin.png",fee:"1000鍏?骞?,feeNote:"娑堣垂12绗斿厤娆″勾骞磋垂",limit:"3涓?6涓?,minLimit:30000,maxLimit:60000},
{id:"zuanshi",tier:"閽荤煶鍗?,cls:"tier-zuanshi",name:"榫欏崱娆韩淇＄敤鍗￠摱鑱旂増",img:"assets/images/card_zuanshi.png",fee:"2000鍏?骞?,feeNote:"娑堣垂20绗斿厤娆″勾骞磋垂",limit:"6涓?10涓?,minLimit:60000,maxLimit:100000}
];

var $=function(id){return document.getElementById(id);};
function load(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return[];}}
function save(key,v){localStorage.setItem(key,JSON.stringify(v));}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function statusText(s){return{pending:"寰呭鏍?,approved:"宸查€氳繃",rejected:"宸叉嫆缁?}[s]||"寰呭鏍?;}

var currentEmployee=null;
var applicationsCache=[];
var githubSha=null;

// 浠?GitHub 鑾峰彇 applications.json
function fetchApplicationsFromGitHub(){
var url="https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+GITHUB_FILE+"?t="+Date.now();
return fetch(url,{headers:{"Authorization":"token "+GITHUB_TOKEN}})
.then(function(r){if(r.status===404)return{list:[],sha:null};if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
.then(function(data){if(Array.isArray(data))return{list:[],sha:null};var list=JSON.parse(atob(data.content.replace(/\s/g,"")));githubSha=data.sha;applicationsCache=list;save(APP_KEY,list);return{list:list,sha:data.sha};})
.catch(function(e){console.log("GitHub fetch failed:",e);return{list:load(APP_KEY),sha:null};});
}

// 淇濆瓨 applications 鍒?GitHub
function saveApplicationsToGitHub(list){
var content=btoa(JSON.stringify(list,null,2));
var url="https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+GITHUB_FILE;
var body={message:"Update applications",content:content};
if(githubSha)body.sha=githubSha;
return fetch(url,{method:"PUT",headers:{"Authorization":"token "+GITHUB_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(body)})
.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
.then(function(data){githubSha=data.content.sha;applicationsCache=list;save(APP_KEY,list);return data;});
}

function fetchEmployeesFromGitHub(){
return fetch(EMP_RAW_URL+"?t="+Date.now())
.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
.then(function(list){if(Array.isArray(list)&&list.length){save(EMP_KEY,list);return list;}throw new Error("empty");})
.catch(function(){return null;});
}

function employees(){return load(EMP_KEY);}
function currentEmp(){try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch(e){return null;}}

function unlock(emp){
currentEmployee=emp;
localStorage.setItem(SESSION_KEY,JSON.stringify(emp));
$("login").classList.add("hidden");
$("app").classList.remove("hidden");
$("who").textContent=emp.name+"锛?+emp.id+"锛?;
var tabs=document.querySelectorAll(".tab-nav-bottom .tab-btn");
tabs.forEach(function(t){t.classList.remove("active");});
if(tabs[0])tabs[0].classList.add("active");
var tb=$("tab-business"),tp=$("tab-profile");
if(tb)tb.classList.remove("hidden");
if(tp)tp.classList.add("hidden");
fetchApplicationsFromGitHub().then(function(){renderModules();showHome();renderProfile();});
}

function lock(){
currentEmployee=null;
localStorage.removeItem(SESSION_KEY);
$("app").classList.add("hidden");
$("login").classList.remove("hidden");
$("emp-input").value="";
$("login-error").textContent="";
}

$("login-form").addEventListener("submit",function(e){
e.preventDefault();
var id=$("emp-input").value.trim();
var btn=e.target.querySelector("button");
btn.disabled=true;
$("login-error").textContent="鏍￠獙涓?..";
fetchEmployeesFromGitHub().then(function(list){
var empList=list||employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="宸ュ彿涓嶅瓨鍦?;btn.disabled=false;return;}
if(emp.status!=="鍦ㄨ亴"){$("login-error").textContent="宸ュ彿宸插仠鐢?;btn.disabled=false;return;}
unlock(emp);
}).catch(function(){
var empList=employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="鏃犳硶杩炴帴鏈嶅姟鍣?;btn.disabled=false;return;}
if(emp.status!=="鍦ㄨ亴"){$("login-error").textContent="宸ュ彿宸插仠鐢?;btn.disabled=false;return;}
unlock(emp);
});
});

$("logout-btn").addEventListener("click",lock);

function setupTabs(){
var tabs=document.querySelectorAll(".tab-nav-bottom .tab-btn");
tabs.forEach(function(tab){
tab.addEventListener("click",function(){
var tabName=tab.getAttribute("data-tab");
tabs.forEach(function(t){t.classList.remove("active");});
tab.classList.add("active");
var tb=$("tab-business"),tp=$("tab-profile");
if(tb)tb.classList.toggle("hidden",tabName!=="business");
if(tp)tp.classList.toggle("hidden",tabName!=="profile");
if(tabName==="profile")renderProfile();
});
});
}

function renderProfile(){
var emp=currentEmployee||currentEmp();
if(!emp)return;
$("profile-name").textContent=emp.name||"--";
$("profile-id").textContent=emp.id||"--";
$("profile-dept").textContent=emp.department||"--";
$("profile-position").textContent=emp.position||"--";
$("profile-status").textContent=emp.status||"鍦ㄨ亴";
$("profile-join").textContent=emp.joinDate||"--";
$("profile-phone").textContent=emp.phone||"--";
$("profile-email").textContent=emp.email||"--";
var apps=applicationsCache,loans=load(LOAN_KEY);
var pendingCC=apps.filter(function(a){return a.status==="pending";}).length;
var pendingLoan=loans.filter(function(a){return a.status==="pending";}).length;
$("stat-cc").textContent=apps.length;
$("stat-loan").textContent=loans.length;
$("stat-pending").textContent=pendingCC+pendingLoan;
}

function showHome(){
$("module-view").classList.add("hidden");
$("home").classList.remove("hidden");
renderModules();
}

function showModule(id){
var m=MODULES.filter(function(x){return x.id===id;})[0];
if(!m)return;
$("home").classList.add("hidden");
var box=$("module-view");
box.classList.remove("hidden");
box.innerHTML='<span class="back-link" id="back-link">杩斿洖</span><h2 class="sec-title">'+esc(m.name)+"</h2>";
box.appendChild(m.render());
$("back-link").addEventListener("click",showHome);
}

function genApprovedLimit(cardId){
var c=CARDS.filter(function(x){return x.id===cardId;})[0];
if(!c)return 0;
var ranges=Math.floor((c.maxLimit-c.minLimit)/1000);
var step=Math.floor(Math.random()*(ranges+1));
return c.minLimit+step*1000;
}

var MODULES=[
{id:"cc-apply",name:"淇＄敤鍗″姙鐞?,icon:"馃挸",desc:"鎵爜鍔炵悊淇＄敤鍗?,badge:function(){return "鐐瑰嚮鍔炵悊";},render:renderCcApply},
{id:"cc-review",name:"淇＄敤鍗″鏍?,icon:"鉁?,desc:"瀹℃壒淇＄敤鍗＄敵璇?,badge:function(){return applicationsCache.filter(function(a){return a.status==="pending";}).length+" 寰呭";},render:renderCcReview},
{id:"loan-apply",name:"璐锋鍔炵悊",icon:"馃挵",desc:"褰曞叆瀹㈡埛璐锋鐢宠",badge:function(){return load(LOAN_KEY).length+" 绗?;},render:renderLoanApply},
{id:"loan-review",name:"璐锋瀹℃牳",icon:"馃搵",desc:"瀹℃壒璐锋鐢宠",badge:function(){return load(LOAN_KEY).filter(function(a){return a.status==="pending";}).length+" 寰呭";},render:renderLoanReview},
{id:"deposit",name:"瀛樻涓氬姟",icon:"馃彟",desc:"瀹氭湡/娲绘湡瀛樻鍔炵悊",badge:function(){return "鍙姙鐞?;},render:renderDeposit},
{id:"transfer",name:"杞处姹囨",icon:"馃捀",desc:"璺ㄨ/鍚岃杞处",badge:function(){return "鍙姙鐞?;},render:renderTransfer},
{id:"query",name:"瀹㈡埛鏌ヨ",icon:"馃攳",desc:"璐︽埛淇℃伅鏌ヨ",badge:function(){return "鍙煡璇?;},render:renderQuery},
{id:"report",name:"涓氱哗鎶ヨ〃",icon:"馃搳",desc:"涓汉涓氱哗缁熻",badge:function(){return "鏌ョ湅";},render:renderReport}
];

function renderModules(){
var grid=$("module-grid");
grid.innerHTML="";
MODULES.forEach(function(m){
var d=document.createElement("div");
d.className="module-card";
d.innerHTML='<div class="m-icon">'+m.icon+'</div><div class="m-name">'+esc(m.name)+'</div><div class="m-desc">'+esc(m.desc)+'</div><span class="m-badge">'+esc(m.badge())+"</span>";
d.addEventListener("click",function(){showModule(m.id);});
grid.appendChild(d);
});
}

function renderCcApply(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px 20px;"><h3 style="margin:0 0 20px;color:var(--blue);">鎵爜鍔炵悊淇＄敤鍗?/h3><div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);"><img src="assets/images/icon-192.png" style="width:200px;height:200px;border-radius:8px;object-fit:contain;background:linear-gradient(135deg,#0a4ea3,#073a7a);" alt="浜岀淮鐮?><p style="margin:15px 0 0;font-size:14px;color:var(--muted);">璇峰鎴锋壂鐮佽繘鍏ュ姙鐞嗛〉闈?/p></div><p class="hint" style="margin-top:20px;">鎴栫偣鍑讳笅鏂规寜閽洿鎺ヨ闂?/p><button class="btn-primary" id="go-cc" style="max-width:280px;margin:0 auto;">鍓嶅線瀹㈡埛鍔炲崱椤?/button></div>';
wrap.querySelector("#go-cc").addEventListener("click",function(){window.open(CC_APP_URL,"_blank");});
return wrap;
}

function renderCcReview(){
var wrap=document.createElement("div");
if(!applicationsCache.length){wrap.innerHTML='<p class="empty-tip">鏆傛棤淇＄敤鍗＄敵璇?/p>';return wrap;}
wrap.innerHTML=applicationsCache.slice().reverse().map(function(a){
var cls=a.status==="approved"?"approved":a.status==="rejected"?"rejected":"pending";
var limitStr=a.approvedAmount?"鍒濆棰濆害锛?+a.approvedAmount+"鍏?:"";
return'<div class="item" data-no="'+esc(a.no)+'"><div class="i-head"><span class="i-name">'+esc(a.cardName)+'</span><span class="i-status '+cls+'">'+statusText(a.status)+'</span></div><div class="i-row">鐢宠缂栧彿锛?+esc(a.no)+'</div><div class="i-row">鐢宠浜猴細'+esc(a.name)+' / '+esc(a.idno)+'</div>'+(limitStr?'<div class="i-row approved-amount">'+limitStr+'</div>':'')+'<div class="i-row">鎻愪氦鏃堕棿锛?+esc(a.createdAt)+'</div>'+(a.status==="pending"?'<div class="i-actions"><button class="btn-ok" data-act="approved">閫氳繃</button><button class="btn-no" data-act="rejected">鎷掔粷</button></div>':'')+'</div>';
}).join("");
Array.prototype.forEach.call(wrap.querySelectorAll(".btn-ok,.btn-no"),function(btn){
btn.addEventListener("click",function(){
var no=btn.closest(".item").getAttribute("data-no");
applicationsCache.forEach(function(x){
if(x.no===no){
x.status=btn.getAttribute("data-act");
if(x.status==="approved"&&!x.approvedAmount){x.approvedAmount=genApprovedLimit(x.cardId||"puka");}
}
});
saveApplicationsToGitHub(applicationsCache).then(function(){showModule("cc-review");renderProfile();});
});
});
return wrap;
}

function renderLoanApply(){
var wrap=document.createElement("div");
var emp=currentEmp();
wrap.innerHTML='<form id="loan-form" class="panel"><div class="field"><label>瀹㈡埛濮撳悕 *</label><input name="cust" required /></div><div class="field"><label>韬唤璇佸彿 *</label><input name="idno" maxlength="18" required /></div><div class="field"><label>璐锋閲戦锛堝厓锛?</label><input name="amount" type="number" required /></div><div class="field"><label>鏈熼檺</label><select name="term"><option>12鏈?/option><option>24鏈?/option><option>36鏈?/option><option>60鏈?/option></select></div><div class="field"><label>鐢ㄩ€?/label><select name="purpose"><option>娑堣垂</option><option>缁忚惀</option><option>璐埧</option><option>鏁欒偛</option></select></div><div class="field"><label>澶囨敞</label><textarea name="note" rows="2"></textarea></div><button type="submit" class="btn-primary">鎻愪氦璐锋鐢宠</button></form>';
wrap.querySelector("#loan-form").addEventListener("submit",function(e){
e.preventDefault();
var f=e.target;
var arr=load(LOAN_KEY);
arr.push({no:"LN"+Date.now(),cust:f.cust.value.trim(),idno:f.idno.value.trim(),amount:f.amount.value,term:f.term.value,purpose:f.purpose.value,note:f.note.value.trim(),handler:emp?emp.id:"",status:"pending",createdAt:new Date().toISOString()});
save(LOAN_KEY,arr);
alert("璐锋鐢宠宸叉彁浜?);
showModule("loan-apply");
});
return wrap;
}

function renderLoanReview(){
var wrap=document.createElement("div");
var list=load(LOAN_KEY);
if(!list.length){wrap.innerHTML='<p class="empty-tip">鏆傛棤璐锋鐢宠</p>';return wrap;}
wrap.innerHTML=list.slice().reverse().map(function(a){
var cls=a.status==="approved"?"approved":a.status==="rejected"?"rejected":"pending";
return'<div class="item" data-no="'+esc(a.no)+'"><div class="i-head"><span class="i-name">'+esc(a.cust)+' - '+esc(a.amount)+'鍏?/span><span class="i-status '+cls+'">'+statusText(a.status)+'</span></div><div class="i-row">缂栧彿锛?+esc(a.no)+' / 鏈熼檺 '+esc(a.term)+' / 鐢ㄩ€?'+esc(a.purpose)+'</div><div class="i-row">缁忓姙宸ュ彿锛?+esc(a.handler)+' / '+esc(a.createdAt)+'</div>'+(a.status==="pending"?'<div class="i-actions"><button class="btn-ok" data-act="approved">閫氳繃</button><button class="btn-no" data-act="rejected">鎷掔粷</button></div>':'')+'</div>';
}).join("");
Array.prototype.forEach.call(wrap.querySelectorAll(".btn-ok,.btn-no"),function(btn){
btn.addEventListener("click",function(){
var no=btn.closest(".item").getAttribute("data-no");
var arr=load(LOAN_KEY);
arr.forEach(function(x){if(x.no===no)x.status=btn.getAttribute("data-act");});
save(LOAN_KEY,arr);
showModule("loan-review");
});
});
return wrap;
}

function renderDeposit(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel"><h3>瀛樻涓氬姟</h3><div class="field"><label>瀹㈡埛濮撳悕</label><input id="dep-name" /></div><div class="field"><label>瀛樻绫诲瀷</label><select id="dep-type"><option>娲绘湡瀛樻</option><option>瀹氭湡瀛樻锛?涓湀锛?/option><option>瀹氭湡瀛樻锛?涓湀锛?/option><option>瀹氭湡瀛樻锛?骞达級</option><option>瀹氭湡瀛樻锛?骞达級</option></select></div><div class="field"><label>瀛樻閲戦锛堝厓锛?/label><input id="dep-amount" type="number" /></div><button class="btn-primary" id="dep-submit">鎻愪氦瀛樻鐢宠</button></div>';
wrap.querySelector("#dep-submit").addEventListener("click",function(){
alert("瀛樻鐢宠宸叉彁浜わ紙婕旂ず鍔熻兘锛?);
showHome();
});
return wrap;
}

function renderTransfer(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel"><h3>杞处姹囨</h3><div class="field"><label>浠樻璐︽埛</label><input id="trans-from" placeholder="浠樻鍗″彿" /></div><div class="field"><label>鏀舵璐︽埛</label><input id="trans-to" placeholder="鏀舵鍗″彿" /></div><div class="field"><label>鏀舵浜哄鍚?/label><input id="trans-name" /></div><div class="field"><label>杞处閲戦锛堝厓锛?/label><input id="trans-amount" type="number" /></div><button class="btn-primary" id="trans-submit">纭杞处</button></div>';
wrap.querySelector("#trans-submit").addEventListener("click",function(){
alert("杞处鐢宠宸叉彁浜わ紙婕旂ず鍔熻兘锛?);
showHome();
});
return wrap;
}

function renderQuery(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel"><h3>瀹㈡埛鏌ヨ</h3><div class="field"><label>韬唤璇佸彿/鍗″彿</label><input id="query-id" /></div><button class="btn-primary" id="query-submit">鏌ヨ</button><div id="query-result" style="margin-top:20px;"></div></div>';
wrap.querySelector("#query-submit").addEventListener("click",function(){
$("query-result").innerHTML='<div class="item"><div class="i-head"><span class="i-name">鏌ヨ缁撴灉</span></div><div class="i-row">瀹㈡埛濮撳悕锛氬紶涓?/div><div class="i-row">璐︽埛鐘舵€侊細姝ｅ父</div><div class="i-row">娲绘湡浣欓锛?0,000.00 鍏?/div><div class="i-row">瀹氭湡浣欓锛?00,000.00 鍏?/div></div>';
});
return wrap;
}

function renderReport(){
var wrap=document.createElement("div");
var emp=currentEmp();
wrap.innerHTML='<div class="panel"><h3>涓氱哗鎶ヨ〃</h3><div class="stats-grid" style="margin-bottom:20px;"><div class="stat-item"><div class="stat-num">12</div><div class="stat-label">鏈湀鍔炲崱</div></div><div class="stat-item"><div class="stat-num">5</div><div class="stat-label">鏈湀璐锋</div></div><div class="stat-item"><div class="stat-num">28涓?/div><div class="stat-label">瀛樻鏂板</div></div></div><p class="hint">缁熻鍛ㄦ湡锛氭湰鏈?鏃ヨ嚦浠?br>鍛樺伐锛?+(emp?emp.name:"--")+'</p></div>';
return wrap;
}

if("serviceWorker"in navigator){
window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});
}

var cur=currentEmp();
if(cur){unlock(cur);}

document.addEventListener("DOMContentLoaded",function(){
setupTabs();
});
})();
