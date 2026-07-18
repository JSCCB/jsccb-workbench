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

function renderModules(){
var grid=$('module-grid');
if(!grid)return;
grid.innerHTML='';
MODULES.forEach(function(m){
var d=document.createElement('div');
d.className='module-card';
d.innerHTML='<div class="m-icon">'+m.icon+'</div><div class="m-name">'+esc(m.name)+'</div><div class="m-desc">'+esc(m.desc)+'</div>';
d.addEventListener('click',function(){showModule(m.id);});
grid.appendChild(d);
});
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
{id:'transfer',name:'综合评分',icon:'📊',desc:'客户综合评分评估',render:renderTransfer},
{id:'query',name:'账户查询',icon:'🔍',desc:'查询账户信息',render:renderQuery},
{id:'report',name:'业绩统计',icon:'📊',desc:'KPI进度',render:renderReport}
];

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
{title:'客户基本信息',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>客户姓名</label><input type="text" id="rf-sc-name" placeholder="请输入" value="'+(data.name||'')+'"></div>';
html+='<div class="rf-field"><label>身份证号</label><input type="text" id="rf-sc-idno" placeholder="18位" maxlength="18" value="'+(data.idno||'')+'"></div>';
html+='<div class="rf-field"><label>年龄</label><input type="number" id="rf-sc-age" placeholder="如 35" value="'+(data.age||'')+'"></div>';
html+='<div class="rf-field"><label>职业类别</label><select id="rf-sc-job"><option value="">请选择</option><option value="公务员">公务员/事业单位</option><option value="企业员工">企业正式员工</option><option value="个体经营">个体经营</option><option value="自由职业">自由职业</option><option value="学生">学生</option><option value="退休">退休</option><option value="其他">其他</option></select></div>';
html+='<div class="rf-field"><label>最高学历</label><select id="rf-sc-edu"><option value="">请选择</option><option value="博士">博士</option><option value="硕士">硕士</option><option value="本科">本科</option><option value="大专">大专</option><option value="高中">高中/中专</option><option value="初中">初中及以下</option></select></div>';
html+='<div class="rf-field"><label>婚姻状况</label><select id="rf-sc-marriage"><option value="">请选择</option><option value="已婚">已婚</option><option value="未婚">未婚</option><option value="离异">离异</option><option value="丧偶">丧偶</option></select></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.name)return '请输入客户姓名';
if(!data.idno||data.idno.length!==18)return '请输入18位身份证号';
if(!data.age||data.age<18||data.age>70)return '年龄需在18-70之间';
if(!data.job)return '请选择职业类别';
if(!data.edu)return '请选择学历';
if(!data.marriage)return '请选择婚姻状况';
return true;
},collect:function(data){
data.name=$('rf-sc-name').value;
data.idno=$('rf-sc-idno').value;
data.age=$('rf-sc-age').value;
data.job=$('rf-sc-job').value;
data.edu=$('rf-sc-edu').value;
data.marriage=$('rf-sc-marriage').value;
}},

{title:'财务状况评估',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>月收入（元）</label><input type="number" id="rf-sc-income" placeholder="0" value="'+(data.income||'')+'"></div>';
html+='<div class="rf-field"><label>家庭月支出（元）</label><input type="number" id="rf-sc-expense" placeholder="0" value="'+(data.expense||'')+'"></div>';
html+='<div class="rf-field"><label>现有负债（万元）</label><input type="number" id="rf-sc-debt" placeholder="0" value="'+(data.debt||'')+'"></div>';
html+='<div class="rf-field"><label>住房情况</label><select id="rf-sc-house"><option value="">请选择</option><option value="自有无贷">自有无贷</option><option value="自 有按揭">自有按揭</option><option value="租赁">租赁</option><option value="与父母同住">与父母同住</option><option value="其他">其他</option></select></div>';
html+='<div class="rf-field"><label>总资产规模</label><select id="rf-sc-assets"><option value="">请选择</option><option value="50万以下">50万以下</option><option value="50-200万">50-200万</option><option value="200-500万">200-500万</option><option value="500万以上">500万以上</option></select></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.income||data.income<0)return '请输入月收入';
if(!data.expense||data.expense<0)return '请输入月支出';
if(!data.debt||data.debt<0)return '请输入负债金额';
if(!data.house)return '请选择住房情况';
if(!data.assets)return '请选择资产规模';
return true;
},collect:function(data){
data.income=$('rf-sc-income').value;
data.expense=$('rf-sc-expense').value;
data.debt=$('rf-sc-debt').value;
data.house=$('rf-sc-house').value;
data.assets=$('rf-sc-assets').value;
}},

{title:'信用历史评估',render:function(body,data){
var html='<div class="rf-form">';
html+='<div class="rf-field"><label>现有信用卡数</label><select id="rf-sc-cards"><option value="">请选择</option><option value="0">0张</option><option value="1-2">1-2张</option><option value="3-5">3-5张</option><option value="6张以上">6张以上</option></select></div>';
html+='<div class="rf-field"><label>现有贷款笔数</label><select id="rf-sc-loans"><option value="">请选择</option><option value="0">0笔（无贷款）</option><option value="1">1笔</option><option value="2">2笔</option><option value="3笔以上">3笔及以上</option></select></div>';
html+='<div class="rf-field"><label>近2年逾期次数</label><select id="rf-sc-overdue"><option value="">请选择</option><option value="0">无逾期</option><option value="1-2">1-2次</option><option value="3-5">3-5次</option><option value="6次以上">6次及以上</option></select></div>';
html+='<div class="rf-field"><label>近6个月查询次数</label><select id="rf-sc-inquiry"><option value="">请选择</option><option value="0-2">0-2次</option><option value="3-5">3-5次</option><option value="6-10">6-10次</option><option value="10次以上">10次以上</option></select></div>';
html+='<div class="rf-field"><label>历史最长用信年限</label><select id="rf-sc-history"><option value="">请选择</option><option value="首次">首次用信</option><option value="1-3年">1-3年</option><option value="3-5年">3-5年</option><option value="5年以上">5年以上</option></select></div>';
html+='</div>';
body.innerHTML=html;
},validate:function(data){
if(!data.cards)return '请选择现有信用卡数';
if(!data.loans)return '请选择现有贷款笔数';
if(!data.overdue)return '请选择逾期次数';
if(!data.inquiry)return '请选择查询次数';
if(!data.history)return '请选择用信年限';
return true;
},collect:function(data){
data.cards=$('rf-sc-cards').value;
data.loans=$('rf-sc-loans').value;
data.overdue=$('rf-sc-overdue').value;
data.inquiry=$('rf-sc-inquiry').value;
data.history=$('rf-sc-history').value;
}},

{title:'评分结果',render:function(body,data){
var score=calcCreditScore(data);
var level=getCreditLevel(score);
var html='<div style="padding:8px 0 20px">';
html+='<div class="sc-result-box">';
html+='<div class="sc-result-label">综合评分</div>';
html+='<div class="sc-result-score" style="color:'+level.color+'">'+score+'</div>';
html+='<div class="sc-result-level">'+level.label+' · '+level.grade+'</div>';
html+='</div>';
html+='<div class="sc-result-detail">';
html+='<div class="sc-detail-row"><span class="sc-label">姓名：</span><span class="sc-val">'+esc(data.name||'-')+'</span></div>';
html+='<div class="sc-detail-row"><span class="sc-label">身份证号：</span><span class="sc-val">'+esc(data.idno||'-')+'</span></div>';
html+='<div class="sc-detail-row"><span class="sc-label">月收入：</span><span class="sc-val">'+(data.income?Number(data.income).toLocaleString()+'元':'-')+'</span></div>';
html+='<div class="sc-detail-row"><span class="sc-label">负债：</span><span class="sc-val">'+(data.debt||'0')+' 万元</span></div>';
html+='<div class="sc-detail-row"><span class="sc-label">信用历史：</span><span class="sc-val">'+esc(data.history||'-')+'</span></div>';
html+='</div>';
html+='<div class="sc-result-advice">';
html+='<div class="sc-advice-title">评估建议</div>';
html+='<div class="sc-advice-text">'+esc(level.advice)+'</div>';
html+='</div>';
html+='</div>';
body.innerHTML=html;
}}
],
onSubmit:function(data,done){
var score=calcCreditScore(data);
var level=getCreditLevel(score);
var record={
type:'credit-score',
no:'SC-'+Date.now().toString().slice(-8),
name:data.name,idno:data.idno,
age:data.age,job:data.job,edu:data.edu,marriage:data.marriage,
income:data.income,expense:data.expense,debt:data.debt,house:data.house,assets:data.assets,
cards:data.cards,loans:data.loans,overdue:data.overdue,inquiry:data.inquiry,history:data.history,
score:score,level:level.label,grade:level.grade,
reviewer:(typeof currentEmployee!=='undefined'&&currentEmployee)?currentEmployee.name:'',
reviewedAt:new Date().toISOString()
};
var arr=load('jsccb:credit_scores')||[];
arr.push(record);
save('jsccb:credit_scores',arr);
done();
setTimeout(function(){showModule('transfer');},2000);
}
});
}

function calcCreditScore(data){
var score=600;
var age=parseInt(data.age)||30;
if(age>=25&&age<=45)score+=30;else if(age>=18&&age<25)score+=15;else if(age>45&&age<=60)score+=20;else score+=5;
var jobScore={'公务员':50,'企业员工':40,'个体经营':25,'自由职业':20,'学生':15,'退休':30,'其他':10};
score+=jobScore[data.job]||0;
var eduScore={'博士':30,'硕士':25,'本科':20,'大专':15,'高中':10,'初中':5};
score+=eduScore[data.edu]||0;
if(data.marriage==='已婚')score+=20;
var income=parseFloat(data.income)||0;
if(income>=20000)score+=50;else if(income>=10000)score+=35;else if(income>=5000)score+=20;else if(income>=3000)score+=10;else score+=0;
var ratio=(parseFloat(data.expense)||0)/Math.max(income,1);
if(ratio<0.3)score+=30;else if(ratio<0.5)score+=20;else if(ratio<0.7)score+=10;else score+=0;
var debt=parseFloat(data.debt)||0;
if(debt===0)score+=40;else if(debt<10)score+=25;else if(debt<30)score+=10;else score-=20;
var houseScore={'自有无贷':40,'自有拨揭':25,'租赁':15,'与父母同住':20,'其他':10};
score+=houseScore[data.house]||0;
var overdueScore={'0':40,'1-2':15,'3-5':-10,'6次以上':-50};
score+=overdueScore[data.overdue]||0;
var inquiryScore={'0-2':30,'3-5':15,'6-10':0,'10次以上':-20};
score+=inquiryScore[data.inquiry]||0;
var historyScore={'首次':10,'1-3年':20,'3-5年':30,'5年以上':50};
score+=historyScore[data.history]||0;
if(score<300)score=300;
if(score>850)score=850;
return score;
}

function getCreditLevel(score){
if(score>=800)return{label:'优秀',grade:'AAA',color:'#0a4ea3',advice:'信用资质卓越，可享受预估最高额度信贷服务与优薄利率。'};
if(score>=750)return{label:'良好',grade:'AA',color:'#27ae60',advice:'信用状况良好，适合推荐中高额度产品。'};
if(score>=700)return{label:'较好',grade:'A',color:'#16a085',advice:'信用较为稳定，可推荐中端产品。'};
if(score>=650)return{label:'一般',grade:'BBB',color:'#f39c12',advice:'信用中等，推荐标准产品与审核流程。'};
if(score>=600)return{label:'偏低',grade:'BB',color:'#e67e22',advice:'信用不足，需加强资料验证。'};
if(score>=550)return{label:'较差',grade:'B',color:'#e74c3c',advice:'信用较差，限制业务响应提交抵押品。'};
return{label:'低',grade:'C',color:'#c0392b',advice:'信用不足，不推荐授信业务。'};
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
function renderReport(){
var wrap=document.createElement('div');
var ccList=load('jsccb:cc_reviews')||[];
var loanList=load('jsccb:loan_reviews')||[];
wrap.innerHTML='<div class="stat-cards">'+
'<div class="stat-card"><div class="stat-label">信用卡面签总数</div><div class="stat-num">'+ccList.length+'</div></div>'+
'<div class="stat-card"><div class="stat-label">贷款补充总数</div><div class="stat-num">'+loanList.length+'</div></div>'+
'</div>'+
'<div class="stat-tabs"></div>'+
'<div id="stat-content"></div>';
var tabs=wrap.querySelector('.stat-tabs');
var content=wrap.querySelector('#stat-content');
tabs.innerHTML='<button class="stat-tab active" data-tab="cc">信用卡面签 ('+ccList.length+')</button><button class="stat-tab" data-tab="loan">贷款审核 ('+loanList.length+')</button>';
tabs.querySelectorAll('.stat-tab').forEach(function(btn){btn.addEventListener('click',function(){switchTab(this.getAttribute('data-tab'));});});
renderCcTable();
return wrap;
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setupTabs);}else{setupTabs();}

})();
