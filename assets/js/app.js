/* JSCCB Workbench v5 */
(function(){
"use strict";

var EMP_KEY="jsccb:employees";
var APP_KEY="jsccb:applications";
var LOAN_KEY="jsccb:loans";
var SESSION_KEY="jsccb:wb_session_v2";
var CC_APP_URL="https://jsccb.github.io/jsccb-credit-card/";
var EMP_RAW_URL="https://raw.githubusercontent.com/JSCCB/jsccb-hr/main/employees.json";

var CARDS=[
{id:"puka",tier:"普卡",cls:"tier-puka",name:"龙卡正青春信用卡数字版",img:"assets/images/card_puka.png",fee:"200元/年",feeNote:"消费5笔免次年年费",limit:"3千-1万",minLimit:3000,maxLimit:10000},
{id:"jinka",tier:"金卡",cls:"tier-jinka",name:"龙卡千里行信用卡",img:"assets/images/card_jinka.png",fee:"500元/年",feeNote:"消费7笔免次年年费",limit:"1万-3万",minLimit:10000,maxLimit:30000},
{id:"baijin",tier:"白金卡",cls:"tier-baijin",name:"建行生活PLUS版",img:"assets/images/card_baijin.png",fee:"1000元/年",feeNote:"消费12笔免次年年费",limit:"3万-6万",minLimit:30000,maxLimit:60000},
{id:"zuanshi",tier:"钻石卡",cls:"tier-zuanshi",name:"龙卡欢享信用卡银联版",img:"assets/images/card_zuanshi.png",fee:"2000元/年",feeNote:"消费20笔免次年年费",limit:"6万-10万",minLimit:60000,maxLimit:100000}
];

var $=function(id){return document.getElementById(id);};
function load(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return[];}}
function save(key,v){localStorage.setItem(key,JSON.stringify(v));}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function statusText(s){return{pending:"待审核",approved:"已通过",rejected:"已拒绝"}[s]||"待审核";}

var currentEmployee=null;

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
$("who").textContent=emp.name+"（"+emp.id+"）";
var tabs=document.querySelectorAll(".tab-nav-bottom .tab-btn");
tabs.forEach(function(t){t.classList.remove("active");});
if(tabs[0])tabs[0].classList.add("active");
var tb=$("tab-business"),tp=$("tab-profile");
if(tb)tb.classList.remove("hidden");
if(tp)tp.classList.add("hidden");
renderModules();
showHome();
renderProfile();
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
$("login-error").textContent="校验中...";
fetchEmployeesFromGitHub().then(function(list){
var empList=list||employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="工号不存在";btn.disabled=false;return;}
if(emp.status!=="在职"){$("login-error").textContent="工号已停用";btn.disabled=false;return;}
unlock(emp);
}).catch(function(){
var empList=employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$("login-error").textContent="无法连接服务器";btn.disabled=false;return;}
if(emp.status!=="在职"){$("login-error").textContent="工号已停用";btn.disabled=false;return;}
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
$("profile-status").textContent=emp.status||"在职";
$("profile-join").textContent=emp.joinDate||"--";
$("profile-phone").textContent=emp.phone||"--";
$("profile-email").textContent=emp.email||"--";
var apps=load(APP_KEY),loans=load(LOAN_KEY);
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
box.innerHTML='<span class="back-link" id="back-link">返回</span><h2 class="sec-title">'+esc(m.name)+"</h2>";
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
{id:"cc-apply",name:"信用卡办理",icon:"💳",desc:"扫码办理信用卡",badge:function(){return "点击办理";},render:renderCcApply},
{id:"cc-review",name:"信用卡审核",icon:"✅",desc:"审批信用卡申请",badge:function(){return load(APP_KEY).filter(function(a){return a.status==="pending";}).length+" 待审";},render:renderCcReview},
{id:"loan-apply",name:"贷款办理",icon:"💰",desc:"录入客户贷款申请",badge:function(){return load(LOAN_KEY).length+" 笔";},render:renderLoanApply},
{id:"loan-review",name:"贷款审核",icon:"📋",desc:"审批贷款申请",badge:function(){return load(LOAN_KEY).filter(function(a){return a.status==="pending";}).length+" 待审";},render:renderLoanReview},
{id:"deposit",name:"存款业务",icon:"🏦",desc:"定期/活期存款办理",badge:function(){return "可办理";},render:renderDeposit},
{id:"transfer",name:"转账汇款",icon:"💸",desc:"跨行/同行转账",badge:function(){return "可办理";},render:renderTransfer},
{id:"query",name:"客户查询",icon:"🔍",desc:"账户信息查询",badge:function(){return "可查询";},render:renderQuery},
{id:"report",name:"业绩报表",icon:"📊",desc:"个人业绩统计",badge:function(){return "查看";},render:renderReport}
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
wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px 20px;"><h3 style="margin:0 0 20px;color:var(--blue);">扫码办理信用卡</h3><div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);"><img src="assets/images/icon-192.png" style="width:200px;height:200px;border-radius:8px;object-fit:contain;background:linear-gradient(135deg,#0a4ea3,#073a7a);" alt="二维码"><p style="margin:15px 0 0;font-size:14px;color:var(--muted);">请客户扫码进入办理页面</p></div><p class="hint" style="margin-top:20px;">或点击下方按钮直接访问</p><button class="btn-primary" id="go-cc" style="max-width:280px;margin:0 auto;">前往客户办卡页</button></div>';
wrap.querySelector("#go-cc").addEventListener("click",function(){window.open(CC_APP_URL,"_blank");});
return wrap;
}

function renderCcReview(){
var wrap=document.createElement("div");
var list=load(APP_KEY);
if(!list.length){wrap.innerHTML='<p class="empty-tip">暂无信用卡申请</p>';return wrap;}
wrap.innerHTML=list.slice().reverse().map(function(a){
var cls=a.status==="approved"?"approved":a.status==="rejected"?"rejected":"pending";
var limitStr=a.approvedAmount?"初审额度："+a.approvedAmount+"元":"";
return'<div class="item" data-no="'+esc(a.no)+'"><div class="i-head"><span class="i-name">'+esc(a.cardName)+'</span><span class="i-status '+cls+'">'+statusText(a.status)+'</span></div><div class="i-row">申请编号：'+esc(a.no)+'</div><div class="i-row">申请人：'+esc(a.name)+' / '+esc(a.idno)+'</div>'+(limitStr?'<div class="i-row approved-amount">'+limitStr+'</div>':'')+'<div class="i-row">提交时间：'+esc(a.createdAt)+'</div>'+(a.status==="pending"?'<div class="i-actions"><button class="btn-ok" data-act="approved">通过</button><button class="btn-no" data-act="rejected">拒绝</button></div>':'')+'</div>';
}).join("");
Array.prototype.forEach.call(wrap.querySelectorAll(".btn-ok,.btn-no"),function(btn){
btn.addEventListener("click",function(){
var no=btn.closest(".item").getAttribute("data-no");
var arr=load(APP_KEY);
arr.forEach(function(x){
if(x.no===no){
x.status=btn.getAttribute("data-act");
if(x.status==="approved"&&!x.approvedAmount){x.approvedAmount=genApprovedLimit(x.cardId||"puka");}
}
});
save(APP_KEY,arr);
showModule("cc-review");
});
});
return wrap;
}

function renderLoanApply(){
var wrap=document.createElement("div");
var emp=currentEmp();
wrap.innerHTML='<form id="loan-form" class="panel"><div class="field"><label>客户姓名 *</label><input name="cust" required /></div><div class="field"><label>身份证号 *</label><input name="idno" maxlength="18" required /></div><div class="field"><label>贷款金额（元）*</label><input name="amount" type="number" required /></div><div class="field"><label>期限</label><select name="term"><option>12期</option><option>24期</option><option>36期</option><option>60期</option></select></div><div class="field"><label>用途</label><select name="purpose"><option>消费</option><option>经营</option><option>购房</option><option>教育</option></select></div><div class="field"><label>备注</label><textarea name="note" rows="2"></textarea></div><button type="submit" class="btn-primary">提交贷款申请</button></form>';
wrap.querySelector("#loan-form").addEventListener("submit",function(e){
e.preventDefault();
var f=e.target;
var arr=load(LOAN_KEY);
arr.push({no:"LN"+Date.now(),cust:f.cust.value.trim(),idno:f.idno.value.trim(),amount:f.amount.value,term:f.term.value,purpose:f.purpose.value,note:f.note.value.trim(),handler:emp?emp.id:"",status:"pending",createdAt:new Date().toISOString()});
save(LOAN_KEY,arr);
alert("贷款申请已提交");
showModule("loan-apply");
});
return wrap;
}

function renderLoanReview(){
var wrap=document.createElement("div");
var list=load(LOAN_KEY);
if(!list.length){wrap.innerHTML='<p class="empty-tip">暂无贷款申请</p>';return wrap;}
wrap.innerHTML=list.slice().reverse().map(function(a){
var cls=a.status==="approved"?"approved":a.status==="rejected"?"rejected":"pending";
return'<div class="item" data-no="'+esc(a.no)+'"><div class="i-head"><span class="i-name">'+esc(a.cust)+' - '+esc(a.amount)+'元</span><span class="i-status '+cls+'">'+statusText(a.status)+'</span></div><div class="i-row">编号：'+esc(a.no)+' / 期限 '+esc(a.term)+' / 用途 '+esc(a.purpose)+'</div><div class="i-row">经办工号：'+esc(a.handler)+' / '+esc(a.createdAt)+'</div>'+(a.status==="pending"?'<div class="i-actions"><button class="btn-ok" data-act="approved">通过</button><button class="btn-no" data-act="rejected">拒绝</button></div>':'')+'</div>';
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
wrap.innerHTML='<div class="panel"><h3>存款业务</h3><div class="field"><label>客户姓名</label><input id="dep-name" /></div><div class="field"><label>存款类型</label><select id="dep-type"><option>活期存款</option><option>定期存款（3个月）</option><option>定期存款（6个月）</option><option>定期存款（1年）</option><option>定期存款（3年）</option></select></div><div class="field"><label>存款金额（元）</label><input id="dep-amount" type="number" /></div><button class="btn-primary" id="dep-submit">提交存款申请</button></div>';
wrap.querySelector("#dep-submit").addEventListener("click",function(){
alert("存款申请已提交（演示功能）");
showHome();
});
return wrap;
}

function renderTransfer(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel"><h3>转账汇款</h3><div class="field"><label>付款账户</label><input id="trans-from" placeholder="付款卡号" /></div><div class="field"><label>收款账户</label><input id="trans-to" placeholder="收款卡号" /></div><div class="field"><label>收款人姓名</label><input id="trans-name" /></div><div class="field"><label>转账金额（元）</label><input id="trans-amount" type="number" /></div><button class="btn-primary" id="trans-submit">确认转账</button></div>';
wrap.querySelector("#trans-submit").addEventListener("click",function(){
alert("转账申请已提交（演示功能）");
showHome();
});
return wrap;
}

function renderQuery(){
var wrap=document.createElement("div");
wrap.innerHTML='<div class="panel"><h3>客户查询</h3><div class="field"><label>身份证号/卡号</label><input id="query-id" /></div><button class="btn-primary" id="query-submit">查询</button><div id="query-result" style="margin-top:20px;"></div></div>';
wrap.querySelector("#query-submit").addEventListener("click",function(){
$("query-result").innerHTML='<div class="item"><div class="i-head"><span class="i-name">查询结果</span></div><div class="i-row">客户姓名：张三</div><div class="i-row">账户状态：正常</div><div class="i-row">活期余额：50,000.00 元</div><div class="i-row">定期余额：100,000.00 元</div></div>';
});
return wrap;
}

function renderReport(){
var wrap=document.createElement("div");
var emp=currentEmp();
wrap.innerHTML='<div class="panel"><h3>业绩报表</h3><div class="stats-grid" style="margin-bottom:20px;"><div class="stat-item"><div class="stat-num">12</div><div class="stat-label">本月办卡</div></div><div class="stat-item"><div class="stat-num">5</div><div class="stat-label">本月贷款</div></div><div class="stat-item"><div class="stat-num">28万</div><div class="stat-label">存款新增</div></div></div><p class="hint">统计周期：本月1日至今<br>员工：'+(emp?emp.name:"--")+'</p></div>';
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
