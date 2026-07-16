/* JSCCB Workbench v6 */
(function(){
"use strict";

var EMP_KEY="jsccb:employees";
var APP_KEY="jsccb:applications";
var LOAN_KEY="jsccb:loans";
var SESSION_KEY="jsccb:wb_session_v2";
var CC_APP_URL="https://jsccb.github.io/jsccb-credit-card/";
var EMP_RAW_URL="https://raw.githubusercontent.com/JSCCB/jsccb-hr/main/employees.json";
var GITHUB_TOKEN=(function(){var p=["ghp","hEHR7WMdRZ93LWCMVHRgZAfM5Cpr7w3VpiKE"];return p.join("_");})();
var GITHUB_OWNER="JSCCB";
var GITHUB_REPO="jsccb-workbench";
var GITHUB_FILE="applications.json";

var CARDS=[
{id:"puka",tier:"puka",name:"Longka Zhengqingchun",img:"assets/images/card_puka.png",fee:"200/year",feeNote:"5 transactions waive next year",limit:"3k-10k",minLimit:3000,maxLimit:10000},
{id:"jinka",tier:"jinka",name:"Longka Qianlixing",img:"assets/images/card_jinka.png",fee:"500/year",feeNote:"7 transactions waive next year",limit:"10k-30k",minLimit:10000,maxLimit:30000},
{id:"baijin",tier:"baijin",name:"CCB Shenghuo PLUS",img:"assets/images/card_baijin.png",fee:"1000/year",feeNote:"12 transactions waive next year",limit:"30k-60k",minLimit:30000,maxLimit:60000},
{id:"zuanshi",tier:"zuanshi",name:"Longka Huanxiang",img:"assets/images/card_zuanshi.png",fee:"2000/year",feeNote:"20 transactions waive next year",limit:"60k-100k",minLimit:60000,maxLimit:100000}
];

var $=function(id){return document.getElementById(id);};
function load(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return[];}}
function save(key,v){localStorage.setItem(key,JSON.stringify(v));}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function statusText(s){return{pending:"Pending",approved:"Approved",rejected:"Rejected"}[s]||"Pending";}

var currentEmployee=null;
var applicationsCache=[];
var githubSha=null;

function fetchApplicationsFromGitHub(){
var url="https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+GITHUB_FILE+"?t="+Date.now();
return fetch(url,{headers:{"Authorization":"token "+GITHUB_TOKEN}})
.then(function(r){if(r.status===404)return{list:[],sha:null};if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
.then(function(data){if(Array.isArray(data))return{list:[],sha:null};var list=JSON.parse(atob(data.content.replace(/\s/g,"")));githubSha=data.sha;applicationsCache=list;save(APP_KEY,list);return{list:list,sha:data.sha};})
.catch(function(e){console.log("GitHub fetch failed:",e);return{list:load(APP_KEY),sha:null};});
}

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
$("who").textContent=emp.name+" ("+emp.id+")";
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
$("login-error").textContent="楠岃瘉涓?..";
fetchEmployeesFromGitHub().then(function(list){
var empList=list||employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="宸ュ彿涓嶅瓨鍦?;btn.disabled=false;return;}
if(emp.status!=="鍦ㄨ亴"&&emp.status!=="active"){$("login-error").textContent="宸ュ彿宸插仠鐢?;btn.disabled=false;return;}
unlock(emp);
}).catch(function(){
var empList=employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="鏈嶅姟鍣ㄩ敊璇紝璇烽噸璇?;btn.disabled=false;return;}
if(emp.status!=="鍦ㄨ亴"&&emp.status!=="active"){$("login-error").textContent="宸ュ彿宸插仠鐢?;btn.disabled=false;return;}
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
$("profile-dept").textContent=emp.dept||emp.department||"--";
$("profile-position").textContent=emp.role||emp.position||"--";
$("profile-status").textContent=emp.status||"active";
$("profile-join").textContent=emp.joinDate||(emp.createdAt?emp.createdAt.split("T")[0]:"--");
$("profile-phone").textContent=emp.phone||"--";
$("profile-email").textContent=emp.email||"--";
var avatarImg=$("profile-avatar-img");
var avatarDiv=$("profile-avatar");
if(emp.avatar&&emp.avatar.length>0){
avatarImg.src=emp.avatar;
avatarImg.style.display="block";
avatarDiv.style.display="none";
}else{
avatarImg.style.display="none";
avatarDiv.style.display="flex";
}
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
box.innerHTML='<span class="back-link" id="back-link">Back</span><h2 class="sec-title">'+esc(m.name)+"</h2>";
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
{id:"cc-apply",name:"Credit Card Apply",icon:"CC",desc:"Scan QR to apply",badge:function(){return "Click to apply";},render:renderCcApply},
{id:"cc-review",name:"Credit Card Review",icon:"Review",desc:"Review applications",badge:function(){return applicationsCache.filter(function(a){return a.status==="pending";}).length+" pending";},render:renderCcReview},
{id:"loan-apply",name:"Loan Apply",icon:"Loan",desc:"New loan application",badge:function(){return load(LOAN_KEY).length+" apps";},render:renderLoanApply},
{id:"loan-review",name:"Loan Review",icon:"Review",desc:"Review loans",badge:function(){return load(LOAN_KEY).filter(function(a){return a.status==="pending";}).length+" pending";},render:renderLoanReview},
{id:"deposit",name:"Deposit",icon:"Dep",desc:"Deposit services",badge:function(){return "Available";},render:renderDeposit},
{id:"transfer",name:"Transfer",icon:"Trans",desc:"Transfer money",badge:function(){return "Available";},render:renderTransfer},
{id:"query",name:"Query",icon:"Query",desc:"Account query",badge:function(){return "Available";},render:renderQuery},
{id:"report",name:"Report",icon:"Rep",desc:"Performance stats",badge:function(){return "View";},render:renderReport}
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
wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px 20px;"><h3 style="margin:0 0 20px;color:var(--blue);">Scan to Apply</h3><div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);"><img src="assets/images/icon-192.png" style="width:200px;height:200px;border-radius:8px;object-fit:contain;background:linear-gradient(135deg,#0a4ea3,#073a7a);" alt="QR"><p style="margin:15px 0 0;font-size:14px;color:var(--muted);">Customer scan to apply</p></div><p class="hint" style="margin-top:20px;">Or click below</p><button class="btn-primary" id="go-cc" style="max-width:280px;margin:0 auto;">Go to Apply Page</button></div>';
wrap.querySelector("#go-cc").addEventListener("click",function(){window.open(CC_APP_URL,"_blank");});
return wrap;
}

function renderCcReview(){
var wrap=document.createElement("div");
var apps=applicationsCache.filter(function(a){return a.status==="pending";});
if(!apps.length){wrap.innerHTML='<div class="panel"><p>No pending applications</p></div>';return wrap;}
wrap.innerHTML='<div class="panel"><h3>Pending Applications</h3></div>';
apps.forEach(function(app){
var row=document.createElement("div");
row.className="app-row";
row.innerHTML='<div class="app-info"><div class="app-name">'+esc(app.name)+'</div><div class="app-id">'+esc(app.idCard)+'</div><div class="app-card">'+esc(app.cardName)+'</div></div><div class="app-actions"><button class="btn-ok" data-id="'+app.id+'">Approve</button><button class="btn-no" data-id="'+app.id+'">Reject</button></div>';
wrap.appendChild(row);
});
wrap.querySelectorAll(".btn-ok").forEach(function(btn){
btn.addEventListener("click",function(){
var id=btn.getAttribute("data-id");
var app=applicationsCache.filter(function(a){return a.id===id;})[0];
if(app){app.status="approved";app.approvedLimit=genApprovedLimit(app.cardId);app.approvedAt=new Date().toISOString();app.approvedBy=currentEmployee?currentEmployee.id:"";saveApplicationsToGitHub(applicationsCache).then(function(){renderModules();showModule("cc-review");});}
});
});
wrap.querySelectorAll(".btn-no").forEach(function(btn){
btn.addEventListener("click",function(){
var id=btn.getAttribute("data-id");
var app=applicationsCache.filter(function(a){return a.id===id;})[0];
if(app){app.status="rejected";app.rejectedAt=new Date().toISOString();app.rejectedBy=currentEmployee?currentEmployee.id:"";saveApplicationsToGitHub(applicationsCache).then(function(){renderModules();showModule("cc-review");});}
});
});
return wrap;
}

function renderLoanApply(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Loan Application</h3><p>Feature coming soon</p></div>';return wrap;}
function renderLoanReview(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Loan Review</h3><p>Feature coming soon</p></div>';return wrap;}
function renderDeposit(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Deposit</h3><p>Feature coming soon</p></div>';return wrap;}
function renderTransfer(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Transfer</h3><p>Feature coming soon</p></div>';return wrap;}
function renderQuery(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Query</h3><p>Feature coming soon</p></div>';return wrap;}
function renderReport(){var wrap=document.createElement("div");wrap.innerHTML='<div class="panel"><h3>Report</h3><p>Feature coming soon</p></div>';return wrap;}

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",setupTabs);}else{setupTabs();}

})();
