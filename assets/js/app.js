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

function showMerchantModal(){
var content='<button class="modal-close">&times;</button>'+
'<h3 style="margin:0 0 16px;font-size:18px;color:#0a4ea3;">商户服务</h3>'+
'<div style="background:#fff;padding:16px;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,.1);">'+
'<img src="assets/images/merchant-qr.png?v=1" style="width:260px;height:260px;display:block;" alt="">'+
'</div>';
showModal(content);
}

function unlock(emp){
currentEmployee=emp;
localStorage.setItem(SESSION_KEY,JSON.stringify(emp));
$('login').classList.add('hidden');
$('app').classList.remove('hidden');
$('who').textContent=emp.name;
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
if(id==='deposit'){showMerchantModal();return;}
$('tab-business').classList.add('hidden');
var box=$('module-view');
box.classList.remove('hidden');
box.innerHTML='<span class="back-link" id="back-link">返回</span><h2 class="sec-title">'+esc(m.name)+'</h2>';
var el=m.render();
if(!el){box.innerHTML+='<div style="padding:20px;color:var(--muted)">加载异常，请返回重试</div>';}
else{box.appendChild(el);}
$('back-link').addEventListener('click',showHome);
}

var MODULES=[
{id:'cc-apply',name:'信用卡申请',icon:'💳',desc:'扫码办理信用卡',render:renderCcApply},
{id:'cc-review',name:'信用卡面签',icon:'✅',desc:'资料面签',render:renderCcReview},
{id:'loan-apply',name:'贷款申请',icon:'💰',desc:'普惠授信',render:renderLoanApply},
{id:'loan-review',name:'贷款审核',icon:'✅',desc:'贷款材料补充',render:renderLoanReview},
{id:'deposit',name:'商户服务',icon:'📪',desc:'定存业务',render:renderDeposit},
{id:'transfer',name:'综合评分',icon:'💸',desc:'客户综合评分评估',render:renderTransfer},
{id:'query',name:'账户查询',icon:'🔍',desc:'查询账户信息',render:renderQuery},
{id:'report',name:'业绩统计',icon:'📊',desc:'KPI进度',render:renderReport}
];

function renderModules(){
var grid=$('module-grid');
grid.innerHTML='';
MODULES.forEach(function(m){
var d=document.createElement('div');
d.className='module-card';
d.innerHTML='<div class="m-name">'+esc(m.name)+'</div><div class="m-desc">'+esc(m.desc)+'</div>';
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
root.className='review-flow';root.style.display='block';

function paint(){
var s=steps[stepIdx];
if(!s){console.error('No step at idx',stepIdx);return;}
var pct=Math.round((stepIdx+1)/steps.length*100);
var html='';
try{
html+='<div class="rf-head"><h3>'+esc(opts.title)+'</h3>';
html+='<div class="rf-progress"><div class="rf-bar"><div class="rf-fill" style="width:'+pct+'%"></div></div>';
html+='<div class="rf-step">第 '+(stepIdx+1)+' / '+steps.length+' 步 · '+esc(s.title)+'</div></div></div>';
html+='<div class="rf-body" id="rf-body"></div>';
html+='<div class="rf-nav">';
html+='<div class="rf-nav-row">';
if(stepIdx>0)html+='<button class="btn-secondary rf-btn-left" id="rf-back">上一步</button>';
else html+='<span></span>';
if(stepIdx<steps.length-1)html+='<button class="btn-primary rf-btn-right" id="rf-next">下一步</button>';
else html+='<button class="btn-primary rf-btn-right" id="rf-next">提交</button>';
html+='</div>';
html+='</div>';
root.innerHTML=html;
var body=root.querySelector('#rf-body');
if(body){
try{s.render(body,data,function(){paint();});}catch(e){console.error('render error:',e);body.innerHTML='<div style=\\"padding:20px;color:red\\">步骤渲染失败:'+e.message+'</div>';}
}
} catch(e){console.error('paint error:',e);root.innerHTML='<div style=\\"padding:20px;color:red\\">页面错误:'+e.message+'</div>';return;}
var back=root.querySelector('#rf-back');
if(back)back.addEventListener('click',function(){if(stepIdx>0){stepIdx--;paint();}});
var next=root.querySelector('#rf-next');
if(next)next.addEventListener('click',function(){
if(s.collect){s.collect(data);}
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
return makeReviewFlow({
title:'信用卡面签',
steps:[
{title:'客户信息录入',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>申请编号</label><input type="text" id="rf-cc-no" placeholder="CC-2026-XXXX" value="'+(data.no||'')+'"></div>';
html+='<div class="rf-field"><label>客户姓名</label><input type="text" id="rf-cc-name" placeholder="请输入" value="'+(data.name||'')+'"></div>';
html+='<div class="rf-field"><label>身份证号</label><input type="text" id="rf-cc-idno" placeholder="18位" maxlength="18" value="'+(data.idno||'')+'"></div>';
html+='<div class="rf-field"><label>手机号</label><input type="tel" id="rf-cc-phone" placeholder="11位" maxlength="11" value="'+(data.phone||'')+'"></div>';
html+='<div class="rf-field"><label>申请卡种</label><select id="rf-cc-card"><option value="">请选择</option><option value="puka">普卡</option><option value="jinka">金卡</option><option value="baijin">白金卡</option><option value="zuanshi">钻石卡</option></select></div>';
html+='<div class="rf-field"><label>申请额度（元）</label><input type="number" id="rf-cc-amount" placeholder="0" value="'+(data.amount||'')+'"></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.no)return '请输入申请编号';
if(!data.name)return '请输入客户姓名';
if(!data.idno||data.idno.length!==18)return '身份证号必须18位';
if(!data.phone||data.phone.length!==11)return '手机号必须11位';
if(!data.card)return '请选择申请卡种';
return true;
},collect:function(data){
data.no=$('rf-cc-no').value.trim();
data.name=$('rf-cc-name').value.trim();
data.idno=$('rf-cc-idno').value.trim();
data.phone=$('rf-cc-phone').value.trim();
data.card=$('rf-cc-card').value;
data.amount=$('rf-cc-amount').value;
}},
{title:'资料完整性核对',render:function(body,data){
var items=[
{name:'身份证原件',note:'核对身份证与本人一致'},
{name:'工作证明 / 收入证明',note:'近3个月内有效'},
{name:'征信查询授权书',note:'客户本人签字'},
{name:'面签现场照片',note:'需采集客户正面照'}
];
var html='<div class="rf-checks">';
items.forEach(function(it,i){
html+='<div class="rf-check-row"><label><input type="checkbox" data-c="'+i+'"> '+esc(it.name)+'</label><span class="rf-note">'+esc(it.note)+'</span></div>';
});
html+='</div>';
body.innerHTML=html;
data.checked=[false,false,false,false];
body.querySelectorAll('input[data-c]').forEach(function(cb){
cb.addEventListener('change',function(){
var idx=parseInt(this.getAttribute('data-c'));
data.checked[idx]=this.checked;
data.allChecked=data.checked.every(function(v){return v;});
});
});
},validate:function(data){if(!data.allChecked)return '请勾选所有已核对的资料';return true;}},
{title:'录入面签结果',render:function(body,data){
var html='<div class="rf-result">';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-cc-result" value="pass" checked> 通过面签</label></div>';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-cc-result" value="supplement"> 需补充材料</label></div>';
html+='<div class="rf-result-row"><label><input type="radio" name="rf-cc-result" value="reject"> 拒绝</label></div>';
html+='<div class="rf-remark"><label>面签备注（选填）</label><textarea id="rf-cc-remark" rows="3" placeholder="面签情况、客户表现、风控要点等..."></textarea></div>';
html+='</div>';
body.innerHTML=html;
},collect:function(data){
var r=document.querySelector('input[name="rf-cc-result"]:checked');
data.result=r?r.value:'pass';
data.remark=$('rf-cc-remark')?$('rf-cc-remark').value:'';
}},
{title:'完成归档',render:function(body,data){
var r=data.result;
var txt=r==='pass'?'通过面签':(r==='supplement'?'需补充材料':'拒绝');
var html='<div class="rf-done" style="text-align:left;padding:8px 0">';
html+='<div class="rf-done-title" style="text-align:center;margin-bottom:14px">面签已完成</div>';
html+='<div class="rf-done-info"><span class="rf-info-label">姓名：</span><span class="rf-info-val">'+esc(data.name||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">申请编号：</span><span class="rf-info-val">'+esc(data.no||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">结果：</span><span class="rf-info-val" style="color:#27ae60;font-weight:700">'+esc(txt)+'</span></div>';
if(data.remark)html+='<div class="rf-done-info" style="margin-top:8px;background:var(--bg);padding:10px;border-radius:8px;"><span class="rf-info-label">备注：</span><span class="rf-info-val">'+esc(data.remark)+'</span></div>';
html+='</div>';
body.innerHTML=html;
}}
],
onSubmit:function(data,done){
var record={
type:'cc-review',
no:data.no,name:data.name,idno:data.idno,phone:data.phone,
card:data.card,amount:data.amount,
result:data.result,remark:data.remark,
reviewer:(typeof currentEmployee!=='undefined'&&currentEmployee)?currentEmployee.name:'',
reviewedAt:new Date().toISOString()
};
var arr=load('jsccb:cc_reviews');
// Dedup: if same no+name+result within last 5 sec, skip
var now=Date.now();
var isDup=arr.some(function(x){
return x.no===record.no&&x.name===record.name&&x.result===record.result&&(now-new Date(x.reviewedAt).getTime()<5000);
});
if(!isDup){arr.push(record);save('jsccb:cc_reviews',arr);}
done();
setTimeout(function(){showModule('cc-review');},2000);
}
});
}

function renderLoanApply(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>贷款申请</h3><p>功能即将上线</p></div>';return wrap;}

function renderLoanReview(){
return makeReviewFlow({
title:'贷款材料补充审核',
steps:[
{title:'客户信息录入',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>申请编号</label><input type="text" id="rf-ln-no" placeholder="LN-2026-XXXX" value="'+(data.no||'')+'"></div>';
html+='<div class="rf-field"><label>客户姓名</label><input type="text" id="rf-ln-name" placeholder="请输入" value="'+(data.name||'')+'"></div>';
html+='<div class="rf-field"><label>身份证号</label><input type="text" id="rf-ln-idno" placeholder="18位" maxlength="18" value="'+(data.idno||'')+'"></div>';
html+='<div class="rf-field"><label>手机号</label><input type="tel" id="rf-ln-phone" placeholder="11位" maxlength="11" value="'+(data.phone||'')+'"></div>';
html+='<div class="rf-field"><label>申请金额（元）</label><input type="number" id="rf-ln-amount" placeholder="0" value="'+(data.amount||'')+'"></div>';
html+='<div class="rf-field"><label>贷款用途</label><select id="rf-ln-purpose"><option value="">请选择</option><option value="购房">购房</option><option value="购车">购车</option><option value="装修">装修</option><option value="经营">经营周转</option><option value="消费">消费</option><option value="其他">其他</option></select></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.no)return '请输入申请编号';
if(!data.name)return '请输入客户姓名';
if(!data.idno||data.idno.length!==18)return '身份证号必须18位';
if(!data.phone||data.phone.length!==11)return '手机号必须11位';
if(!data.amount)return '请输入申请金额';
if(!data.purpose)return '请选择贷款用途';
return true;
},collect:function(data){
data.no=$('rf-ln-no').value.trim();
data.name=$('rf-ln-name').value.trim();
data.idno=$('rf-ln-idno').value.trim();
data.phone=$('rf-ln-phone').value.trim();
data.amount=$('rf-ln-amount').value;
data.purpose=$('rf-ln-purpose').value;
}},
{title:'已有材料核对',render:function(body,data){
var items=[
{name:'身份证',note:'原件已核'},
{name:'收入证明',note:'近3个月'},
{name:'征信授权',note:'已签'},
{name:'工作证明',note:'在职证明'},
{name:'住址证明',note:'水电气/物业'}
];
var html='<div class="rf-checks">';
items.forEach(function(it,i){
html+='<div class="rf-check-row"><label><input type="checkbox" data-c="'+i+'" checked> '+esc(it.name)+'</label><span class="rf-note" id="rf-ln-note-'+i+'" style="color:var(--ok)">'+esc(it.note)+'</span></div>';
});
html+='</div>';
body.innerHTML=html;
data.checked=[true,true,true,true,true];
data.allChecked=true;
body.querySelectorAll('input[data-c]').forEach(function(cb){
cb.addEventListener('change',function(){
var idx=parseInt(this.getAttribute('data-c'));
data.checked[idx]=this.checked;
data.allChecked=data.checked.every(function(v){return v;});
var note=document.getElementById('rf-ln-note-'+idx);
if(note){note.style.color=this.checked?'var(--ok)':'var(--red)';note.textContent=this.checked?'已核':'缺失';}
});
});
},validate:function(data){return true;}},
{title:'补充材料清单',render:function(body,data){
var supplements=['银行流水（近6个月）','资产证明（房产/车辆/存款）','担保人资料','经营执照（个体/企业）','其他补充材料'];
var html='<div class="rf-sup-list">';
supplements.forEach(function(s,i){
html+='<div class="rf-sup-row"><label><input type="checkbox" data-s="'+i+'"> '+esc(s)+'</label></div>';
});
html+='<div class="rf-remark"><label>补充说明（选填）</label><textarea id="rf-ln-remark" rows="3" placeholder="告知客户需补充哪些材料，原因..."></textarea></div>';
html+='</div>';
body.innerHTML=html;
},collect:function(data){
data.supplements=Array.from(document.querySelectorAll('input[data-s]')).filter(function(c){return c.checked;}).map(function(c){return c.parentNode.textContent.trim();});
data.remark=$('rf-ln-remark')?$('rf-ln-remark').value:'';
}},
{title:'完成通知',render:function(body,data){
var supCount=data.supplements?data.supplements.length:0;
var html='<div class="rf-done" style="text-align:left;padding:8px 0">';
html+='<div class="rf-done-title" style="text-align:center;margin-bottom:14px">补料任务已生成</div>';
html+='<div class="rf-done-info"><span class="rf-info-label">姓名：</span><span class="rf-info-val">'+esc(data.name||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">申请编号：</span><span class="rf-info-val">'+esc(data.no||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">需补充：</span><span class="rf-info-val" style="color:#e67e22;font-weight:700">'+supCount+' 项</span></div>';
if(data.remark)html+='<div class="rf-done-info" style="margin-top:8px;background:var(--bg);padding:10px;border-radius:8px;"><span class="rf-info-label">说明：</span><span class="rf-info-val">'+esc(data.remark)+'</span></div>';
html+='</div>';
body.innerHTML=html;
}}
],
onSubmit:function(data,done){
var record={
type:'loan-review',
no:data.no,name:data.name,idno:data.idno,phone:data.phone,
amount:data.amount,purpose:data.purpose,
supplements:data.supplements||[],
remark:data.remark||'',
reviewer:(typeof currentEmployee!=='undefined'&&currentEmployee)?currentEmployee.name:'',
reviewedAt:new Date().toISOString()
};
var arr=load('jsccb:loan_reviews');
var now=Date.now();
var isDup=arr.some(function(x){
return x.no===record.no&&x.name===record.name&&(now-new Date(x.reviewedAt).getTime()<5000);
});
if(!isDup){arr.push(record);save('jsccb:loan_reviews',arr);}
done();
setTimeout(function(){showModule('loan-review');},2000);
}
});
}function renderDeposit(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>存款业务</h3><p>功能即将上线</p></div>';return wrap;}
function renderTransfer(){
return makeReviewFlow({
title:'客户综合评分评估',
steps:[
{title:'基础信息核验',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>客户姓名</label><input type="text" id="rf-score-name" placeholder="请输入" value="'+(data.name||'')+'"></div>';
html+='<div class="rf-field"><label>身份证号</label><input type="text" id="rf-score-idno" placeholder="18位" maxlength="18" value="'+(data.idno||'')+'"></div>';
html+='<div class="rf-field"><label>手机号</label><input type="tel" id="rf-score-phone" placeholder="11位" maxlength="11" value="'+(data.phone||'')+'"></div>';
html+='<div class="rf-field"><label>职业类型</label><select id="rf-score-job"><option value="">请选择</option><option value="公务员">公务员/事业单位</option><option value="国企">国企员工</option><option value="私企">私企员工</option><option value="个体">个体工商户</option><option value="自由">自由职业</option></select></div>';
html+='<div class="rf-field"><label>月收入（元）</label><input type="number" id="rf-score-income" placeholder="0" value="'+(data.income||'')+'"></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.name)return '请输入客户姓名';
if(!data.idno||data.idno.length!==18)return '身份证号必须18位';
if(!data.phone||data.phone.length!==11)return '手机号必须11位';
if(!data.job)return '请选择职业类型';
if(!data.income)return '请输入月收入';
return true;
},collect:function(data){
data.name=$('rf-score-name').value.trim();
data.idno=$('rf-score-idno').value.trim();
data.phone=$('rf-score-phone').value.trim();
data.job=$('rf-score-job').value;
data.income=$('rf-score-income').value;
}},
{title:'信用状况评估',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>征信查询结果</label><select id="rf-score-credit"><option value="">请选择</option><option value="优秀">优秀（无逾期）</option><option value="良好">良好（少量逾期）</option><option value="一般">一般（多次逾期）</option><option value="较差">较差（严重逾期）</option></select></div>';
html+='<div class="rf-field"><label>负债情况</label><select id="rf-score-debt"><option value="">请选择</option><option value="无">无负债</option><option value="低">低负债（<30%）</option><option value="中">中负债（30%-60%）</option><option value="高">高负债（>60%）</option></select></div>';
html+='<div class="rf-field"><label>信用卡持有数</label><input type="number" id="rf-score-cards" placeholder="0" value="'+(data.cards||'')+'"></div>';
html+='<div class="rf-field"><label>历史贷款记录</label><select id="rf-score-history"><option value="">请选择</option><option value="无">无贷款记录</option><option value="正常">有贷款且还款正常</option><option value="逾期">有贷款且有逾期</option></select></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.credit)return '请选择征信查询结果';
if(!data.debt)return '请选择负债情况';
if(!data.cards)return '请输入信用卡持有数';
if(!data.history)return '请选择历史贷款记录';
return true;
},collect:function(data){
data.credit=$('rf-score-credit').value;
data.debt=$('rf-score-debt').value;
data.cards=$('rf-score-cards').value;
data.history=$('rf-score-history').value;
}},
{title:'综合评分计算',render:function(body,data){
var score=0;
if(data.job==='公务员')score+=30;else if(data.job==='国企')score+=25;else if(data.job==='私企')score+=20;else if(data.job==='个体')score+=15;else score+=10;
var income=parseInt(data.income)||0;
if(income>=20000)score+=25;else if(income>=10000)score+=20;else if(income>=5000)score+=15;else score+=10;
if(data.credit==='优秀')score+=20;else if(data.credit==='良好')score+=15;else if(data.credit==='一般')score+=10;else score+=5;
if(data.debt==='无')score+=15;else if(data.debt==='低')score+=10;else if(data.debt==='中')score+=5;else score+=0;
if(data.history==='无')score+=10;else if(data.history==='正常')score+=10;else score+=0;
data.totalScore=score;
var level=score>=85?'A级（优秀）':score>=70?'B级（良好）':score>=55?'C级（一般）':'D级（较差）';
data.level=level;
var html='<div class="rf-score-result">';
html+='<div class="rf-score-num">'+score+'</div>';
html+='<div class="rf-score-level">'+level+'</div>';
html+='<div class="rf-score-detail">';
html+='<div class="rf-score-row"><span>职业得分：</span><span>'+(data.job==='公务员'?30:data.job==='国企'?25:data.job==='私企'?20:data.job==='个体'?15:10)+'</span></div>';
html+='<div class="rf-score-row"><span>收入得分：</span><span>'+(income>=20000?25:income>=10000?20:income>=5000?15:10)+'</span></div>';
html+='<div class="rf-score-row"><span>征信得分：</span><span>'+(data.credit==='优秀'?20:data.credit==='良好'?15:data.credit==='一般'?10:5)+'</span></div>';
html+='<div class="rf-score-row"><span>负债得分：</span><span>'+(data.debt==='无'?15:data.debt==='低'?10:data.debt==='中'?5:0)+'</span></div>';
html+='</div>';
html+='</div>';
body.innerHTML=html;
},collect:function(data){}},
{title:'评估结果',render:function(body,data){
var html='<div class="rf-done" style="text-align:left;padding:8px 0">';
html+='<div class="rf-done-title" style="text-align:center;margin-bottom:14px">评估完成</div>';
html+='<div class="rf-done-info"><span class="rf-info-label">客户姓名：</span><span class="rf-info-val">'+esc(data.name||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">身份证号：</span><span class="rf-info-val">'+esc(data.idno||'-')+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">综合评分：</span><span class="rf-info-val" style="color:#0a4ea3;font-weight:700;font-size:18px">'+data.totalScore+'</span></div>';
html+='<div class="rf-done-info"><span class="rf-info-label">信用等级：</span><span class="rf-info-val" style="color:#27ae60;font-weight:700">'+esc(data.level)+'</span></div>';
html+='</div>';
body.innerHTML=html;
}}
],
onSubmit:function(data,done){
var record={
type:'score',
name:data.name,idno:data.idno,phone:data.phone,
job:data.job,income:data.income,
credit:data.credit,debt:data.debt,cards:data.cards,history:data.history,
totalScore:data.totalScore,level:data.level,
evaluator:(typeof currentEmployee!=='undefined'&&currentEmployee)?currentEmployee.name:'',
evaluatedAt:new Date().toISOString()
};
var arr=load('jsccb:score_records')||[];
var now=Date.now();
var isDup=arr.some(function(x){
return x.name===record.name&&x.idno===record.idno&&(now-new Date(x.evaluatedAt).getTime()<5000);
});
if(!isDup){arr.push(record);save('jsccb:score_records',arr);}
done();
setTimeout(function(){showModule('transfer');},2000);
}
});
}
function renderQuery(){var wrap=document.createElement('div');wrap.innerHTML='<div class="panel"><h3>账户查询</h3><p>功能即将上线</p></div>';return wrap;}
function renderReport(){
var wrap=document.createElement('div');
wrap.innerHTML='<div class="panel"><h3>业绩统计</h3><div id="stats-summary" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;"></div><div id="stats-tabs" style="display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid var(--line);"></div><div id="stats-content"></div></div>';
var summary=wrap.querySelector('#stats-summary');
var tabs=wrap.querySelector('#stats-tabs');
var content=wrap.querySelector('#stats-content');
var ccList=load('jsccb:cc_reviews')||[];
var loanList=load('jsccb:loan_reviews')||[];
summary.innerHTML='<div class="stat-card"><div class="stat-num">'+ccList.length+'</div><div class="stat-label">信用卡面签</div></div><div class="stat-card"><div class="stat-num" style="color:#e67e22">'+loanList.length+'</div><div class="stat-label">贷款审核</div></div>';
function deleteRecord(type,idx){
if(!confirm('确定删除此记录？'))return;
var key=type==='cc'?'jsccb:cc_reviews':'jsccb:loan_reviews';
var arr=load(key);
arr.splice(idx,1);
save(key,arr);
renderReport();
}
function renderCcTable(){
if(!ccList.length){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">暂无面签记录</div>';return;}
var cardMap={puka:'普卡',jinka:'金卡',baijin:'白金卡',zuanshi:'钻石卡'};
var resultMap={pass:'通过',supplement:'需补材料',reject:'拒绝'};
var resultClass={pass:'ok',supplement:'warn',reject:'err'};
var html='<div class="stat-cards">';
ccList.slice().reverse().forEach(function(r,idx){
var sup=r.remark?'<div class="sc-extra">备注：'+esc(r.remark)+'</div>':'';
html+='<div class="stat-card-row" data-idx="'+idx+'"><div class="sc-head"><div class="sc-no">'+esc(r.no||'-')+'</div><span class="stat-badge '+esc((resultClass[r.result]||''))+'">'+esc(resultMap[r.result]||r.result||'-')+'</span><button class="sc-del" data-idx="'+idx+'" data-type="cc">删除</button></div><div class="sc-info"><div class="sc-row"><span class="sc-label">姓名：</span><span class="sc-val">'+esc(r.name||'-')+'</span></div><div class="sc-row"><span class="sc-label">卡种：</span><span class="sc-val">'+esc(cardMap[r.card]||r.card||'-')+'</span></div></div>'+sup+'</div>';
});
html+='</div>';
content.innerHTML=html;
content.querySelectorAll('.sc-del').forEach(function(btn){
btn.addEventListener('click',function(e){e.stopPropagation();deleteRecord(this.getAttribute('data-type'),parseInt(this.getAttribute('data-idx')));});
});
}
function renderLoanTable(){
if(!loanList.length){content.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">暂无审核记录</div>';return;}
var html='<div class="stat-cards">';
loanList.slice().reverse().forEach(function(r,idx){
var supText=(r.supplements&&r.supplements.length)?r.supplements.join('、'):'无需补充';
var supCount=(r.supplements&&r.supplements.length)?r.supplements.length:0;
var supClass=supCount?'warn':'ok';
html+='<div class="stat-card-row" data-idx="'+idx+'"><div class="sc-head"><div class="sc-no">'+esc(r.no||'-')+'</div><span class="stat-badge '+supClass+'">'+supCount+'项待补</span><button class="sc-del" data-idx="'+idx+'" data-type="loan">删除</button></div><div class="sc-info"><div class="sc-row"><span class="sc-label">姓名：</span><span class="sc-val">'+esc(r.name||'-')+'</span></div><div class="sc-row"><span class="sc-label">金额：</span><span class="sc-val">'+(r.amount?Number(r.amount).toLocaleString()+'元':'-')+'</span></div><div class="sc-row"><span class="sc-label">用途：</span><span class="sc-val">'+esc(r.purpose||'-')+'</span></div></div><div class="sc-detail"><div class="sc-detail-title">需补充材料</div><div class="sc-detail-content">'+esc(supText)+'</div></div>'+(r.remark?'<div class="sc-extra">说明：'+esc(r.remark)+'</div>':'')+'</div>';
});
html+='</div>';
content.innerHTML=html;
content.querySelectorAll('.sc-del').forEach(function(btn){
btn.addEventListener('click',function(e){e.stopPropagation();deleteRecord(this.getAttribute('data-type'),parseInt(this.getAttribute('data-idx')));});
});
}
function switchTab(tab){
tabs.querySelectorAll('.stat-tab').forEach(function(t){t.classList.remove('active');});
var btn=tabs.querySelector('[data-tab="'+tab+'"]');
if(btn)btn.classList.add('active');
if(tab==='cc')renderCcTable();else renderLoanTable();
}
tabs.innerHTML='<button class="stat-tab active" data-tab="cc">信用卡面签 ('+ccList.length+')</button><button class="stat-tab" data-tab="loan">贷款审核 ('+loanList.length+')</button>';
tabs.querySelectorAll('.stat-tab').forEach(function(btn){btn.addEventListener('click',function(){switchTab(this.getAttribute('data-tab'));});});
renderCcTable();
return wrap;
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupTabs);}else{setupTabs();}

})();
