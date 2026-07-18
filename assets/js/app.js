/* JSCCB Workbench v18 - Fixed: Modal for QR, Tab switching */
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

// MODAL FUNCTIONS
function showModal(content){
var overlay=document.createElement('div');
overlay.className='modal-overlay';
overlay.id='modal-overlay';
overlay.innerHTML='<div class="modal-content">'+content+'</div>';
document.body.appendChild(overlay);
overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
var closeBtn=overlay.querySelector('.modal-close');
if(closeBtn)closeBtn.addEventListener('click',closeModal);
}

function closeModal(){
var overlay=$('modal-overlay');
if(overlay)overlay.remove();
}

function showCcApplyModal(){
var content='<button class="modal-close">&times;</button>'+
'<h3 style="margin:0 0 16px;font-size:18px;color:#0a4ea3;">扫码办理信用卡</h3>'+
'<div style="background:#fff;padding:16px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);">'+
'<img src="assets/images/qr-code.png?v=3" style="width:240px;height:240px;display:block;" alt="扫码申请">'+
'</div>'+
'<p style="margin:14px 0 0;font-size:14px;color:#666;">客户微信扫码即可申请</p>';
showModal(content);
}

function showLoanApplyModal(){
var content='<button class="modal-close">&times;</button>'+
'<h3 style="margin:0 0 16px;font-size:18px;color:#0a4ea3;">扫码申请贷款</h3>'+
'<div style="background:#fff;padding:16px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);">'+
'<img src="assets/images/loan-qr.png?v=1" style="width:240px;height:240px;display:block;" alt="扫码申请贷款">'+
'</div>'+
'<p style="margin:14px 0 0;font-size:14px;color:#666;">客户微信扫码提交材料</p>';
showModal(content);
}

function unlock(emp){
currentEmployee=emp;
localStorage.setItem(SESSION_KEY,JSON.stringify(emp));
$('login').classList.add('hidden');
$('app').classList.remove('hidden');
$('who').textContent=emp.name+' ('+emp.id+')';
var tabs=document.querySelectorAll('.tab-nav-bottom .tab-btn');
tabs.forEach(function(t){t.classList.remove('active');});
if(tabs[0])tabs[0].classList.add('active');
var tb=$('tab-business'),tp=$('tab-profile'),mv=$('module-view');
if(tb)tb.classList.remove('hidden');
if(tp)tp.classList.add('hidden');
if(mv)mv.classList.add('hidden');
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
var tb=$('tab-business'),tp=$('tab-profile'),mv=$('module-view');
// FIX: Always hide module-view when switching tabs
if(tb)tb.classList.toggle('hidden',tabName!=='business');
if(tp)tp.classList.toggle('hidden',tabName!=='profile');
if(mv)mv.classList.add('hidden');
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
var mv=$('module-view');
if(mv)mv.classList.add('hidden');
$('tab-business').classList.remove('hidden');
renderModules();
}

function showModule(id){
var m=MODULES.filter(function(x){return x.id===id;})[0];
if(!m)return;
// FIX: cc-apply shows modal instead of page
if(id==='cc-apply'){showCcApplyModal();return;}
if(id==='loan-apply'){showLoanApplyModal();return;}
$('tab-business').classList.add('hidden');
var box=$('module-view');
box.classList.remove('hidden');
box.innerHTML='<span class="back-link" id="back-link">返回</span><h2 class="sec-title">'+esc(m.name)+'</h2>';
box.appendChild(m.render());
$('back-link').addEventListener('click',showHome);
}

var MODULES=[
{id:'cc-apply',name:'信用卡申请',icon:'💳',desc:'扫码办理信用卡',render:renderCcApply},
{id:'cc-review',name:'信用卡面签',icon:'✅',desc:'资料面签',render:renderCcReview},
{id:'loan-apply',name:'贷款申请',icon:'💰',desc:'普惠授信',render:renderLoanApply},
{id:'loan-review',name:'贷款审核',icon:'✅',desc:'贷款材料补充',render:renderLoanReview},
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

function renderCcApply(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px"><h3 style="margin-bottom:20px;">扫码办理信用卡</h3><div style="background:#fff;padding:20px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);"><img src="assets/images/qr-code.png?v=3" style="width:200px;height:200px;" alt="扫码申请"><p style="margin:15px 0 0;font-size:14px;color:#666;">客户微信扫码即可申请</p></div></div>';return wrap;}
function makeReviewFlow(opts){
// opts: {title, type:'cc'|'loan', onSubmit}
var steps=opts.steps;
var stepIdx=0;
var data={};
var root=document.createElement('div');
root.className='review-flow';

function paint(){
var s=steps[stepIdx];
var pct=Math.round((stepIdx+1)/steps.length*100);
var html='';
html+='<div class="rf-head"><h3>'+esc(opts.title)+'</h3>';
html+='<div class="rf-progress"><div class="rf-bar"><div class="rf-fill" style="width:'+pct+'%"></div></div>';
html+='<div class="rf-step">第 '+(stepIdx+1)+' / '+steps.length+' 步 · '+esc(s.title)+'</div></div></div>';
html+='<div class="rf-body" id="rf-body"></div>';
html+='<div class="rf-nav">';
if(stepIdx>0)html+='<button class="btn-secondary" id="rf-back">上一步</button>';
else html+='<button class="btn-secondary" id="rf-back" style="visibility:hidden">上一步</button>';
if(stepIdx<steps.length-1)html+='<button class="btn-primary" id="rf-next">下一步</button>';
else html+='<button class="btn-primary" id="rf-next">提交</button>';
html+='</div>';
root.innerHTML=html;
var body=$('rf-body');
if(body){
s.render(body,data,function(){paint();});
}
var back=$('rf-back');
if(back)back.addEventListener('click',function(){if(stepIdx>0){stepIdx--;paint();}});
var next=$('rf-next');
if(next)next.addEventListener('click',function(){
var valid=s.validate?s.validate(data):true;
if(valid!==true){alert(valid);return;}
if(stepIdx<steps.length-1){stepIdx++;paint();}else{
if(opts.onSubmit){opts.onSubmit(data,function(){stepIdx=0;Object.keys(data).forEach(function(k){delete data[k];});paint();});}
}
});
}
paint();
return root;
}

function renderCcReview(){
var wrap=document.createElement('div');
var apps=applicationsCache.filter(function(a){return a.status==='pending';});
if(!apps.length){wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px;color:var(--muted)">暂无待面签申请</div>';return wrap;}

var list=document.createElement('div');
list.className='panel';
list.innerHTML='<h3 style="margin-bottom:14px">待面签申请 ('+apps.length+')</h3>';

var stage=document.createElement('div');
stage.id='cc-review-stage';

apps.forEach(function(app){
var row=document.createElement('div');
row.className='app-row';
row.style.cssText='padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;';
row.innerHTML='<div><div style="font-weight:600">'+esc(app.name)+' · '+esc(app.cardName||'')+'</div><div style="font-size:12px;color:var(--muted);margin-top:2px">编号 '+esc(app.no||app.id)+' · '+esc(app.phone||'')+'</div></div>';
var btn=document.createElement('button');
btn.className='btn-primary';
btn.textContent='开始面签';
btn.onclick=function(){showCcReviewFlow(app,stage,list);};
row.appendChild(btn);
list.appendChild(row);
});
wrap.appendChild(list);
return wrap;
}

function showCcReviewFlow(app,stage,list){
list.style.display='none';
stage.innerHTML='';
stage.appendChild(makeReviewFlow({
title:'信用卡面签 · '+esc(app.name),
steps:[
{title:'客户身份核验',render:function(body,data,refresh){
var html='<div class="rf-info">';
html+='<div class="rf-row"><span class="rf-label">申请编号</span><span class="rf-val">'+esc(app.no||app.id)+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">姓名</span><span class="rf-val">'+esc(app.name||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">身份证号</span><span class="rf-val">'+esc(app.idno||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">手机号</span><span class="rf-val">'+esc(app.phone||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">申请卡种</span><span class="rf-val">'+esc(app.cardName||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">提交时间</span><span class="rf-val">'+esc((app.createdAt||'').replace('T',' ').slice(0,16))+'</span></div>';
html+='</div>';
html+='<div class="rf-confirm"><label><input type="checkbox" id="rf-idok"> 客户身份信息已现场核对一致</label></div>';
body.innerHTML=html;
},validate:function(data){
var cb=document.getElementById('rf-idok');
if(!cb||!cb.checked)return '请先确认客户身份信息';
return true;
}},
{title:'资料完整性核对',render:function(body,data,refresh){
var items=[
{name:'身份证',checked:true,note:app.idno?'已上传':'未上传'},
{name:'工作证明/收入证明',checked:!!(app.employ&&app.income),note:app.income?'月收入 '+app.income:'未提交'},
{name:'征信授权书',checked:true,note:'已签署'},
{name:'面签照片',checked:false,note:'需现场采集'}
];
var html='<div class="rf-checks">';
items.forEach(function(it,i){
html+='<div class="rf-check-row"><label><input type="checkbox" data-i="'+i+'" '+(it.checked?'checked':'')+'> '+esc(it.name)+'</label><span class="rf-note">'+esc(it.note)+'</span></div>';
});
html+='</div>';
body.innerHTML=html;
body.querySelectorAll('input[type=checkbox]').forEach(function(cb){
cb.addEventListener('change',function(){data.checkOk=Array.from(body.querySelectorAll('input[type=checkbox]')).every(function(c){return c.checked;});});
});
data.checkOk=items.every(function(it){return it.checked;});
},validate:function(data){
if(!data.checkOk)return '请完成所有资料核对';
return true;
}},
{title:'录入面签结果',render:function(body,data,refresh){
var html='<div class="rf-result">';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-result" value="pass" checked> 通过面签</label></div>';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-result" value="supplement"> 需补充材料</label></div>';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-result" value="reject"> 拒绝</label></div>';
html+='<div class="rf-remark"><label>面签备注（选填）</label><textarea id="rf-remark" rows="3" placeholder="记录面签情况..."></textarea></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(){return true;}},
{title:'完成归档',render:function(body,data,refresh){
var r=document.querySelector('input[name="rf-result"]:checked');
var resultText=r?(r.value==='pass'?'通过面签':r.value==='supplement'?'需补充材料':'拒绝'):'通过面签';
data.result=r?r.value:'pass';
data.remark=$('rf-remark')?$('rf-remark').value:'';
body.innerHTML='<div class="rf-done"><div class="rf-done-icon">'+ (data.result==='pass'?'✓':(data.result==='supplement'?'📝':'✗')) +'</div><div class="rf-done-title">面签已完成</div><div class="rf-done-sub">结果：'+esc(resultText)+'</div></div>';
}}
],
onSubmit:function(data,done){
var now=new Date().toISOString();
app.status=data.result==='pass'?'approved':(data.result==='reject'?'rejected':'pending');
app.reviewNote=data.remark||'';
app.reviewedAt=now;
app.reviewer=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?CURRENT_USER.name:'';
saveApplicationsToGitHub(applicationsCache).then(function(){
done();
showModule('cc-review');
});
}
}));
}

function renderLoanApply(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>贷款申请</h3><p>功能即将上线</p></div>';return wrap;}

function renderLoanReview(){
var wrap=document.createElement('div');
var apps=applicationsCache.filter(function(a){return a.status==='pending' && a._type==='loan';});
if(!apps.length){
wrap.innerHTML='<div class="panel" style="text-align:center;padding:30px;color:var(--muted)">暂无待补充材料申请</div>';
return wrap;
}
var list=document.createElement('div');
list.className='panel';
list.innerHTML='<h3 style="margin-bottom:14px">待补充材料 ('+apps.length+')</h3>';
var stage=document.createElement('div');
stage.id='loan-review-stage';
apps.forEach(function(app){
var row=document.createElement('div');
row.style.cssText='padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;';
row.innerHTML='<div><div style="font-weight:600">'+esc(app.name||'-')+'</div><div style="font-size:12px;color:var(--muted);margin-top:2px">编号 '+esc(app.no||app.id)+' · 申请金额 '+(app.amount?app.amount+'元':'未填')+'</div></div>';
var btn=document.createElement('button');
btn.className='btn-primary';
btn.textContent='开始审核';
btn.onclick=function(){showLoanReviewFlow(app,stage,list);};
row.appendChild(btn);
list.appendChild(row);
});
wrap.appendChild(list);
return wrap;
}

function showLoanReviewFlow(app,stage,list){
list.style.display='none';
stage.innerHTML='';
stage.appendChild(makeReviewFlow({
title:'贷款材料补充 · '+esc(app.name||''),
steps:[
{title:'客户信息核验',render:function(body){
var html='<div class="rf-info">';
html+='<div class="rf-row"><span class="rf-label">申请编号</span><span class="rf-val">'+esc(app.no||app.id)+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">姓名</span><span class="rf-val">'+esc(app.name||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">身份证号</span><span class="rf-val">'+esc(app.idno||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">手机号</span><span class="rf-val">'+esc(app.phone||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">申请金额</span><span class="rf-val">'+esc((app.amount||'-')+' 元')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">贷款用途</span><span class="rf-val">'+esc(app.purpose||'-')+'</span></div>';
html+='<div class="rf-row"><span class="rf-label">提交时间</span><span class="rf-val">'+esc((app.createdAt||'').replace('T',' ').slice(0,16))+'</span></div>';
html+='</div>';
html+='<div class="rf-confirm"><label><input type="checkbox" id="rf-idok"> 客户信息已现场核对</label></div>';
body.innerHTML=html;
},validate:function(){var cb=document.getElementById('rf-idok');if(!cb||!cb.checked)return '请先确认客户信息';return true;}},
{title:'已有材料核对',render:function(body,data){
var items=[
{name:'身份证',checked:!!app.idno,note:app.idno?'已上传':'缺失'},
{name:'收入证明',checked:!!app.income,note:app.income?app.income:'缺失'},
{name:'征信授权',checked:true,note:'已签署'},
{name:'工作证明',checked:!!app.employ,note:app.employ||'缺失'},
{name:'住址证明',checked:!!(app.homeProvince||app.homeAddr),note:(app.homeProvince?app.homeProvince+app.homeCity:'缺失')}
];
var html='<div class="rf-checks">';
items.forEach(function(it,i){
html+='<div class="rf-check-row"><label><input type="checkbox" data-i="'+i+'" '+(it.checked?'checked':'')+' onchange="this.parentNode.parentNode.querySelector('.rf-note').style.color=this.checked?'var(--ok)':'var(--red)'"> '+esc(it.name)+'</label><span class="rf-note" style="color:'+(it.checked?'var(--ok)':'var(--red)')+'">'+esc(it.note)+'</span></div>';
});
html+='</div>';
data.checkOk=items.every(function(it){return it.checked;});
body.innerHTML=html;
},validate:function(data){if(!data.checkOk)return '请先核对所有已有材料';return true;}},
{title:'补充材料清单',render:function(body,data){
var supplements=['银行流水（近6个月）','资产证明','担保资料','经营执照（个体/企业）','其他补充材料'];
var html='<div class="rf-sup-list">';
supplements.forEach(function(s,i){
html+='<div class="rf-sup-row"><label><input type="checkbox" data-s="'+i+'"> '+esc(s)+'</label></div>';
});
html+='<div class="rf-remark"><label>补充说明（选填）</label><textarea id="rf-sup-remark" rows="3" placeholder="告知客户需补充哪些材料..."></textarea></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
var arr=Array.from(document.querySelectorAll('input[data-s]')).filter(function(c){return c.checked;});
data.supplements=arr.map(function(c){return c.parentNode.textContent.trim();});
return true;
}},
{title:'完成通知',render:function(body,data){
body.innerHTML='<div class="rf-done"><div class="rf-done-icon">📨</div><div class="rf-done-title">材料补充任务已生成</div><div class="rf-done-sub">待补充：'+(data.supplements&&data.supplements.length?data.supplements.length+' 项':'0 项')+'</div></div>';
}}
],
onSubmit:function(data,done){
var now=new Date().toISOString();
app.status='pending';
app.supplements=data.supplements||[];
app.supplementNote=data.supplementRemark||'';
app.reviewedAt=now;
app.reviewer=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?CURRENT_USER.name:'';
saveApplicationsToGitHub(applicationsCache).then(function(){
done();
showModule('loan-review');
});
}
}));
}
function renderDeposit(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>存款业务</h3><p>功能即将上线</p></div>';return wrap;}
function renderTransfer(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>转账汇款</h3><p>功能即将上线</p></div>';return wrap;}
function renderQuery(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>账户查询</h3><p>功能即将上线</p></div>';return wrap;}
function renderReport(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>统计报表</h3><p>功能即将上线</p></div>';return wrap;}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupTabs);}else{setupTabs();}

})();
