/* JSCCB 员工工作台 (PWA) v4
 * 登录凭证 = HR 创建的工号（localStorage: jsccb:employees）。
 * 信用卡申请来自 jsccb-credit-card（jsccb:applications）。
 * 模块采用注册表模式，新增业务只需往 MODULES 数组追加一项即可扩展。
 */
(function () {
  "use strict";

  var EMP_KEY = "jsccb:employees";
  var APP_KEY = "jsccb:applications";
  var LOAN_KEY = "jsccb:loans";
  var SESSION_KEY = "jsccb:wb_session_v2";
  var CC_APP_URL = "https://jsccb.github.io/jsccb-credit-card/";
  var EMP_RAW_URL = "https://raw.githubusercontent.com/JSCCB/jsccb-hr/main/employees.json";

  // 与信用卡APP保持一致的卡种映射（带图片）
  var CARDS = [
    { id: "puka", tier: "普卡", cls: "tier-puka", name: "龙卡正青春信用卡数字版",
      img: "assets/images/card_puka.png",
      fee: "200元/年", feeNote: "消费5笔免次年年费", limit: "3千-1万",
      minLimit: 3000, maxLimit: 10000 },
    { id: "jinka", tier: "金卡", cls: "tier-jinka", name: "龙卡千里行信用卡",
      img: "assets/images/card_jinka.png",
      fee: "500元/年", feeNote: "消费7笔免次年年费", limit: "1万-3万",
      minLimit: 10000, maxLimit: 30000 },
    { id: "baijin", tier: "白金卡", cls: "tier-baijin", name: "建行生活PLUS版",
      img: "assets/images/card_baijin.png",
      fee: "1000元/年", feeNote: "消费12笔免次年年费", limit: "3万-6万",
      minLimit: 30000, maxLimit: 60000 },
    { id: "zuanshi", tier: "钻石卡", cls: "tier-zuanshi", name: "龙卡欢享信用卡银联版",
      img: "assets/images/card_zuanshi.png",
      fee: "2000元/年", feeNote: "消费20笔免次年年费", limit: "6万-10万",
      minLimit: 60000, maxLimit: 100000 }
  ];

  var $ = function (id) { return document.getElementById(id); };
  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function save(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function statusText(s) { return { pending: "待审核", approved: "已通过", rejected: "已拒绝" }[s] || "待审核"; }

  var currentEmployee = null;

  /* ---------- 从 GitHub 拉取最新员工列表（多设备同步） ---------- */
  function fetchEmployeesFromGitHub() {
    return fetch(EMP_RAW_URL + "?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (list) {
        if (Array.isArray(list) && list.length) {
          save(EMP_KEY, list);
          return list;
        }
        throw new Error("空数据");
      })
      .catch(function () { return null; });
  }

  /* 获取员工列表：优先 GitHub，回退本地缓存 */
  function employees() { return load(EMP_KEY); }
  function currentEmp() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  
  function unlock(emp) {
    currentEmployee = emp;
    localStorage.setItem(SESSION_KEY, JSON.stringify(emp));
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("who").textContent = emp.name + "（" + emp.id + "）";
    // 重置 Tab 到业务页
    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function(t) { t.classList.remove("active"); });
    tabs[0].classList.add("active");
    $("tab-business").classList.remove("hidden");
    $("tab-profile").classList.add("hidden");
    renderModules();
    showHome();
    renderProfile();
  }
  
  function lock() {
    currentEmployee = null;
    localStorage.removeItem(SESSION_KEY);
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");
    $("emp-input").value = "";
    $("login-error").textContent = "";
  }
  
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = $("emp-input").value.trim();
    var btn = e.target.querySelector("button");
    btn.disabled = true;
    $("login-error").textContent = "校验中…";
    
    fetchEmployeesFromGitHub().then(function (list) {
      var empList = list || employees();
      var emp = empList.filter(function (x) { return x.id === id; })[0];
      if (!emp) { 
        $("login-error").textContent = "工号不存在，请先由 HR 创建。"; 
        btn.disabled = false;
        return; 
      }
      if (emp.status !== "在职") { 
        $("login-error").textContent = "该工号已停用，请联系 HR。"; 
        btn.disabled = false;
        return; 
      }
      unlock(emp);
    }).catch(function () {
      var empList = employees();
      var emp = empList.filter(function (x) { return x.id === id; })[0];
      if (!emp) { 
        $("login-error").textContent = "无法连接服务器，工号信息不可用。"; 
        btn.disabled = false;
        return; 
      }
      if (emp.status !== "在职") { 
        $("login-error").textContent = "该工号已停用，请联系 HR。"; 
        btn.disabled = false;
        return; 
      }
      unlock(emp);
    });
  });
  
  $("logout-btn").addEventListener("click", lock);

  /* ---------- Tab 切换 ---------- */
  function setupTabs() {
    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function(tab) {
      tab.addEventListener("click", function() {
        var tabName = tab.getAttribute("data-tab");
        tabs.forEach(function(t) { t.classList.remove("active"); });
        tab.classList.add("active");
        
        var businessTab = $("tab-business");
        var profileTab = $("tab-profile");
        if (businessTab) businessTab.classList.toggle("hidden", tabName !== "business");
        if (profileTab) profileTab.classList.toggle("hidden", tabName !== "profile");
        
        if (tabName === "profile") renderProfile();
      });
    });
  }

  /* ---------- 个人资料页 ---------- */
  function renderProfile() {
    var emp = currentEmployee || currentEmp();
    if (!emp) return;
    
    $("profile-name").textContent = emp.name || "--";
    $("profile-id").textContent = emp.id || "--";
    $("profile-dept").textContent = emp.department || "--";
    $("profile-position").textContent = emp.position || "--";
    $("profile-status").textContent = emp.status || "在职";
    $("profile-join").textContent = emp.joinDate || "--";
    $("profile-phone").textContent = emp.phone || "--";
    $("profile-email").textContent = emp.email || "--";
    
    // 统计
    var apps = load(APP_KEY);
    var loans = load(LOAN_KEY);
    var pendingCC = apps.filter(function(a) { return a.status === "pending"; }).length;
    var pendingLoan = loans.filter(function(a) { return a.status === "pending"; }).length;
    
    $("stat-cc").textContent = apps.length;
    $("stat-loan").textContent = loans.length;
    $("stat-pending").textContent = pendingCC + pendingLoan;
  }

  /* ---------- 视图 ---------- */
  function showHome() {
    $("module-view").classList.add("hidden");
    $("home").classList.remove("hidden");
    renderModules();
  }
  
  function showModule(id) {
    var m = MODULES.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    $("home").classList.add("hidden");
    var box = $("module-view");
    box.classList.remove("hidden");
    box.innerHTML = '<span class="back-link" id="back-link">← 返回</span><h2 class="sec-title">' + esc(m.name) + "</h2>";
    box.appendChild(m.render());
    $("back-link").addEventListener("click", showHome);
  }

  /* 生成初审额度：千位后百十个分位为0 */
  function genApprovedLimit(cardId) {
    var c = CARDS.filter(function (x) { return x.id === cardId; })[0];
    if (!c) return 0;
    var ranges = Math.floor((c.maxLimit - c.minLimit) / 1000);
    var step = Math.floor(Math.random() * (ranges + 1));
    return c.minLimit + step * 1000;
  }

  /* ---------- 模块注册表（可扩展） ---------- */
  var MODULES = [
    { id: "cc-apply", name: "信用卡办理", icon: "💳", desc: "为客户提交信用卡申请",
      badge: function () { return load(APP_KEY).length + " 笔申请"; },
      render: renderCcApply },
    { id: "cc-review", name: "信用卡审核", icon: "✅", desc: "审批信用卡申请单",
      badge: function () { return load(APP_KEY).filter(function (a) { return a.status === "pending"; }).length + " 待审"; },
      render: renderCcReview },
    { id: "loan-apply", name: "贷款办理", icon: "💰", desc: "录入客户贷款申请",
      badge: function () { return load(LOAN_KEY).length + " 笔"; },
      render: renderLoanApply },
    { id: "loan-review", name: "贷款审核", icon: "📋", desc: "审批贷款申请",
      badge: function () { return load(LOAN_KEY).filter(function (a) { return a.status === "pending"; }).length + " 待审"; },
      render: renderLoanReview },
    { id: "more", name: "更多模块", icon: "➕", desc: "扩展业务（示例）",
      badge: function () { return "可扩展"; },
      render: renderMore }
  ];

  function renderModules() {
    var grid = $("module-grid");
    grid.innerHTML = "";
    MODULES.forEach(function (m) {
      var d = document.createElement("div");
      d.className = "module-card";
      d.innerHTML = '<div class="m-icon">' + m.icon + '</div>' +
        '<div class="m-name">' + esc(m.name) + "</div>" +
        '<div class="m-desc">' + esc(m.desc) + "</div>" +
        '<span class="m-badge">' + esc(m.badge()) + "</span>";
      d.addEventListener("click", function () { showModule(m.id); });
      grid.appendChild(d);
    });
  }

  /* 信用卡办理 */
  function renderCcApply() {
    var wrap = document.createElement("div");
    var cards = CARDS.map(function (c) {
      return '<div class="mini-card ' + c.cls + '"><div><div class="mc-tier">' + esc(c.tier) +
        '</div><div class="mc-name">' + esc(c.name) + "</div></div><span>›</span></div>";
    }).join("");
    wrap.innerHTML =
      '<div class="mini-cards">' + cards + "</div>" +
      '<div class="fee-table">' + CARDS.map(function (c) {
        return '<div class="fee-row"><span class="f-tier">' + esc(c.tier) + '</span><span class="f-name">' + esc(c.name) + '</span><span class="f-fee">' + esc(c.fee) + '</span><span class="f-note">' + esc(c.feeNote) + '</span></div>';
      }).join("") + '</div>' +
      '<p class="hint">客户申请请使用专用办卡页（含完整身份与资料采集）。</p>' +
      '<button class="btn-primary" id="go-cc">前往客户办卡页</button>';
    wrap.querySelector("#go-cc").addEventListener("click", function () { window.open(CC_APP_URL, "_blank"); });
    return wrap;
  }

  /* 信用卡审核（含初审额度生成） */
  function renderCcReview() {
    var wrap = document.createElement("div");
    var list = load(APP_KEY);
    if (!list.length) { wrap.innerHTML = '<p class="empty-tip">暂无信用卡申请</p>'; return wrap; }
    wrap.innerHTML = list.slice().reverse().map(function (a) {
      var cls = a.status === "approved" ? "approved" : a.status === "rejected" ? "rejected" : "pending";
      var limitStr = a.approvedAmount ? "初审额度：" + a.approvedAmount + "元" : "";
      return '<div class="item" data-no="' + esc(a.no) + '">' +
        '<div class="i-head"><span class="i-name">' + esc(a.cardName) + '</span>' +
        '<span class="i-status ' + cls + '">' + statusText(a.status) + "</span></div>" +
        '<div class="i-row">申请编号：' + esc(a.no) + "</div>" +
        '<div class="i-row">申请人：' + esc(a.name) + " / " + esc(a.idno) + "</div>" +
        (limitStr ? '<div class="i-row approved-amount">' + limitStr + "</div>" : "") +
        '<div class="i-row">提交时间：' + esc(a.createdAt) + "</div>" +
        (a.status === "pending"
          ? '<div class="i-actions"><button class="btn-ok" data-act="approved">通过</button><button class="btn-no" data-act="rejected">拒绝</button></div>'
          : "") +
        "</div>";
    }).join("");
    Array.prototype.forEach.call(wrap.querySelectorAll(".btn-ok, .btn-no"), function (btn) {
      btn.addEventListener("click", function () {
        var no = btn.closest(".item").getAttribute("data-no");
        var arr = load(APP_KEY);
        arr.forEach(function (x) {
          if (x.no === no) {
            x.status = btn.getAttribute("data-act");
            if (x.status === "approved" && !x.approvedAmount) {
              x.approvedAmount = genApprovedLimit(x.cardId || "puka");
            }
          }
        });
        save(APP_KEY, arr);
        showModule("cc-review");
      });
    });
    return wrap;
  }

  /* 贷款办理 */
  function renderLoanApply() {
    var wrap = document.createElement("div");
    var emp = currentEmp();
    wrap.innerHTML =
      '<form id="loan-form" class="panel">' +
      '<div class="field"><label>客户姓名 *</label><input name="cust" required /></div>' +
      '<div class="field"><label>身份证号 *</label><input name="idno" maxlength="18" required /></div>' +
      '<div class="field"><label>贷款金额（元）*</label><input name="amount" type="number" required /></div>' +
      '<div class="field"><label>期限</label><select name="term"><option>12期</option><option>24期</option><option>36期</option><option>60期</option></select></div>' +
      '<div class="field"><label>用途</label><select name="purpose"><option>消费</option><option>经营</option><option>购房</option><option>教育</option></select></div>' +
      '<div class="field"><label>备注</label><textarea name="note" rows="2"></textarea></div>' +
      '<button type="submit" class="btn-primary">提交贷款申请</button>' +
      "</form>";
    wrap.querySelector("#loan-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var arr = load(LOAN_KEY);
      arr.push({
        no: "LN" + Date.now(),
        cust: f.cust.value.trim(),
        idno: f.idno.value.trim(),
        amount: f.amount.value,
        term: f.term.value,
        purpose: f.purpose.value,
        note: f.note.value.trim(),
        handler: emp ? emp.id : "",
        status: "pending",
        createdAt: new Date().toISOString()
      });
      save(LOAN_KEY, arr);
      alert("贷款申请已提交");
      showModule("loan-apply");
    });
    return wrap;
  }

  /* 贷款审核 */
  function renderLoanReview() {
    var wrap = document.createElement("div");
    var list = load(LOAN_KEY);
    if (!list.length) { wrap.innerHTML = '<p class="empty-tip">暂无贷款申请</p>'; return wrap; }
    wrap.innerHTML = list.slice().reverse().map(function (a) {
      var cls = a.status === "approved" ? "approved" : a.status === "rejected" ? "rejected" : "pending";
      return '<div class="item" data-no="' + esc(a.no) + '">' +
        '<div class="i-head"><span class="i-name">' + esc(a.cust) + " · " + esc(a.amount) + "元</span>' +
        '<span class="i-status ' + cls + '">' + statusText(a.status) + "</span></div>" +
        '<div class="i-row">编号：' + esc(a.no) + " / 期限 " + esc(a.term) + " / 用途 " + esc(a.purpose) + "</div>" +
        '<div class="i-row">经办工号：' + esc(a.handler) + " / " + esc(a.createdAt) + "</div>" +
        (a.status === "pending"
          ? '<div class="i-actions"><button class="btn-ok" data-act="approved">通过</button><button class="btn-no" data-act="rejected">拒绝</button></div>'
          : "") +
        "</div>";
    }).join("");
    Array.prototype.forEach.call(wrap.querySelectorAll(".btn-ok, .btn-no"), function (btn) {
      btn.addEventListener("click", function () {
        var no = btn.closest(".item").getAttribute("data-no");
        var arr = load(LOAN_KEY);
        arr.forEach(function (x) { if (x.no === no) x.status = btn.getAttribute("data-act"); });
        save(LOAN_KEY, arr);
        showModule("loan-review");
      });
    });
    return wrap;
  }

  /* 更多 */
  function renderMore() {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="panel"><h2>如何扩展模块</h2>' +
      '<p class="hint" style="margin:0">在 <code>assets/js/app.js</code> 的 <code>MODULES</code> 数组追加一项即可：' +
      '<br><code>{ id, name, icon, desc, badge, render }</code><br>' +
      '新增模块自动出现在首页宫格，无需改动其他代码。例如「理财销售」「风控核查」等。</p></div>';
    return wrap;
  }

  /* PWA */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // 初始化
  setupTabs();
  
  // 启动
  var cur = currentEmp();
  if (cur) unlock(cur);
})();
