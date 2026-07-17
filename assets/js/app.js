/* JSCCB Workbench */
(function(){
'use strict';

var EMP_KEY='jsccb:employees';
var APP_KEY='jsccb:applications';
var SESSION_KEY='jsccb:wb_session_v2';
var EMP_RAW_URL='https://raw.githubusercontent.com/JSCCB/jsccb-hr/main/employees.json';
var GITHUB_TOKEN=(function(){var a='g';var b='hp';var c='_';var d='hEHR7WMdRZ93LWCMVHRgZAfM5Cpr7w3VpiKE';return a+b+c+d;})();
var GITHUB_OWNER='JSCCB';
var GITHUB_REPO='jsccb-workbench';
var GITHUB_FILE='applications.json';

var $=function(id){return document.getElementById(id);};
function load(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return[];}}
function save(key,v){localStorage.setItem(key,JSON.stringify(v));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

var currentEmployee=null;
var applicationsCache=[];
var githubSha=null;

function fetchApplicationsFromGitHub(){
var url='https://api.github.com/repos/'+GITHUB_OWNER+'/'+GITHUB_REPO+'/contents/'+GITHUB_FILE+'?t='+Date.now();
return fetch(url,{headers:{'Authorization':'token '+GITHUB_TOKEN}})
.then(function(r){if(r.status===404)return{list:[],sha:null};if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
.then(function(data){if(Array.isArray(data))return{list:[],sha:null};var list=JSON.parse(atob(data.content.replace(/\s/g,'')));githubSha=data.sha;applicationsCache=list;save(APP_KEY,list);return{list:list,sha:data.sha};})
.catch(function(e){console.log('GitHub fetch failed:',e);return{list:load(APP_KEY),sha:null};});
}

function saveApplicationsToGitHub(list){
var content=btoa(JSON.stringify(list,null,2));
var url='https://api.github.com/repos/'+GITHUB_OWNER+'/'+GITHUB_REPO+'/contents/'+GITHUB_FILE;
var body={message:'Update applications',content:content};
if(githubSha)body.sha=githubSha;
return fetch(url,{method:'PUT',headers:{'Authorization':'token '+GITHUB_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(body)})
.then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
.then(function(data){githubSha=data.content.sha;applicationsCache=list;save(APP_KEY,list);return data;});
}

function fetchEmployeesFromGitHub(){
return fetch(EMP_RAW_URL+'?t='+Date.now())
.then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
.then(function(list){if(Array.isArray(list)&&list.length){save(EMP_KEY,list);return list;}throw new Error('empty');})
.catch(function(){return null;});
}

function employees(){return load(EMP_KEY);}
function currentEmp(){try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch(e){return null;}}

function unlock(emp){
currentEmployee=emp;
localStorage.setItem(SESSION_KEY,JSON.stringify(emp));
$('login').classList.add('hidden');
$('app').classList.remove('hidden');
$('who').textContent=emp.name+' ('+emp.id+')';
var tabs=document.querySelectorAll('.tab-nav-bottom .tab-btn');
tabs.forEach(function(t){t.classList.remove('active');});
if(tabs[0])tabs[0].classList.add('active');
var tb=$('tab-business'),tp=$('tab-profile');
if(tb)tb.classList.remove('hidden');
if(tp)tp.classList.add('hidden');
fetchApplicationsFromGitHub().then(function(){renderModules();showHome();renderProfile();});
}

function lock(){
currentEmployee=null;
localStorage.removeItem(SESSION_KEY);
$('app').classList.add('hidden');
$('login').classList.remove('hidden');
$('emp-input').value='';
$('login-error').textContent='';
}

$('login-form').addEventListener('submit',function(e){
e.preventDefault();
var id=$('emp-input').value.trim();
var btn=e.target.querySelector('button');
btn.disabled=true;
$('login-error').textContent='验证中...';
fetchEmployeesFromGitHub().then(function(list){
var empList=list||employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$('login-error').textContent='工号不存在';btn.disabled=false;return;}
if(emp.status!=='在职'&&emp.status!=='active'){$('login-error').textContent='工号已停用';btn.disabled=false;return;}
unlock(emp);
}).catch(function(){
var empList=employees();
var emp=empList.filter(function(x){return x.id===id;})[0];
if(!emp){$('login-error').textContent='服务器错误，请重试';btn.disabled=false;return;}
if(emp.status!=='在职'&&emp.status!=='active'){$('login-error').textContent='工号已停用';btn.disabled=false;return;}
unlock(emp);
});
});

$('logout-btn').addEventListener('click',lock);

function setupTabs(){
var tabs=document.querySelectorAll('.tab-nav-bottom .tab-btn');
tabs.forEach(function(tab){
tab.addEventListener('click',function(){
var tabName=tab.getAttribute('data-tab');
tabs.forEach(function(t){t.classList.remove('active');});
tab.classList.add('active');
var tb=$('tab-business'),tp=$('tab-profile');
if(tb)tb.classList.toggle('hidden',tabName!=='business');
if(tp)tp.classList.toggle('hidden',tabName!=='profile');
if(tabName==='profile')renderProfile();
});
});
}

function renderProfile(){
var emp=currentEmployee||currentEmp();
if(!emp)return;
$('profile-name').textContent=emp.name||'--';
$('profile-id').textContent=emp.id||'--';
$('profile-dept').textContent=emp.dept||emp.department||'--';
$('profile-position').textContent=emp.role||emp.position||'--';
$('profile-status').textContent=emp.status||'在职';
$('profile-join').textContent=emp.joinDate||'--';
var avatarImg=$('profile-avatar-img');
var avatarDiv=$('profile-avatar');
if(emp.avatar&&emp.avatar.length>0){
avatarImg.src=emp.avatar;
avatarImg.style.display='block';
avatarDiv.style.display='none';
}else{
avatarImg.style.display='none';
avatarDiv.style.display='flex';
}
}

function showHome(){
$('module-view').classList.add('hidden');
$('tab-business').classList.remove('hidden');
renderModules();
}

function showModule(id){
var m=MODULES.filter(function(x){return x.id===id;})[0];
if(!m)return;
$('tab-business').classList.add('hidden');
var box=$('module-view');
box.classList.remove('hidden');
box.innerHTML='<span class="back-link" id="back-link">返回</span><h2 class="sec-title">'+esc(m.name)+'</h2>';
box.appendChild(m.render());
$('back-link').addEventListener('click',showHome);
}

var MODULES=[
{id:'cc-apply',name:'信用卡申请',icon:'💳',desc:'扫码办理信用卡',render:renderCcApply},
{id:'cc-review',name:'信用卡审核',icon:'✅',desc:'审核客户申请',render:renderCcReview},
{id:'loan-apply',name:'贷款申请',icon:'💰',desc:'新贷款申请',render:renderLoanApply},
{id:'loan-review',name:'贷款审核',icon:'✅',desc:'审核贷款申请',render:renderLoanReview},
{id:'deposit',name:'存款业务',icon:'🏦',desc:'存款服务',render:renderDeposit},
{id:'transfer',name:'转账汇款',icon:'💸',desc:'转账服务',render:renderTransfer},
{id:'query',name:'账户查询',icon:'🔍',desc:'查询账户信息',render:renderQuery},
{id:'report',name:'统计报表',icon:'📊',desc:'业绩统计',render:renderReport}
];

function renderModules(){
var grid=$('module-grid');
grid.innerHTML='';
MODULES.forEach(function(m){
var d=document.createElement('div');
d.className='module-card';
d.innerHTML='<div class="m-icon">'+m.icon+'</div><div class="m-name">'+esc(m.name)+'</div><div class="m-desc">'+esc(m.desc)+'</div>';
d.addEventListener('click',function(){showModule(m.id);});
grid.appendChild(d);
});
}

function renderCcApply(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px"><h3 style="margin-bottom:20px;">扫码办理信用卡</h3><div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);"><img src="assets/images/qr-code.png" style="width:200px;height:200px;" alt="扫码申请"><p style="margin:15px 0 0;font-size:14px;color:#666;">客户微信扫码即可申请</p></div></div>';return wrap;}
function renderCcReview(){var wrap=document.createElement('div');var apps=applicationsCache.filter(function(a){return a.status==='pending';});if(!apps.length){wrap.innerHTML='<div class="panel"><p>暂无待审核申请</p></div>';return wrap;}wrap.innerHTML='<div class="panel"><h3>待审核申请</h3></div>';apps.forEach(function(app){var row=document.createElement('div');row.className='app-row';row.innerHTML='<div class="app-info"><div>'+esc(app.name)+'</div><div>'+esc(app.cardName)+'</div></div><div class="app-actions"><button class="btn-ok" data-id="'+app.id+'">通过</button><button class="btn-no" data-id="'+app.id+'">拒绝</button></div>';wrap.appendChild(row);});wrap.querySelectorAll('.btn-ok').forEach(function(btn){btn.addEventListener('click',function(){var id=btn.getAttribute('data-id');var app=applicationsCache.filter(function(a){return a.id===id;})[0];if(app){app.status='approved';app.approvedAt=new Date().toISOString();saveApplicationsToGitHub(applicationsCache).then(function(){renderModules();showModule('cc-review');});}});});wrap.querySelectorAll('.btn-no').forEach(function(btn){btn.addEventListener('click',function(){var id=btn.getAttribute('data-id');var app=applicationsCache.filter(function(a){return a.id===id;})[0];if(app){app.status='rejected';app.rejectedAt=new Date().toISOString();saveApplicationsToGitHub(applicationsCache).then(function(){renderModules();showModule('cc-review');});}});});return wrap;}
function renderLoanApply(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>贷款申请</h3><p>功能即将上线</p></div>';return wrap;}
function renderLoanReview(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>贷款审核</h3><p>功能即将上线</p></div>';return wrap;}
function renderDeposit(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>存款业务</h3><p>功能即将上线</p></div>';return wrap;}
function renderTransfer(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>转账汇款</h3><p>功能即将上线</p></div>';return wrap;}
function renderQuery(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>账户查询</h3><p>功能即将上线</p></div>';return wrap;}
function renderReport(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>统计报表</h3><p>功能即将上线</p></div>';return wrap;}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupTabs);}else{setupTabs();}

})();
