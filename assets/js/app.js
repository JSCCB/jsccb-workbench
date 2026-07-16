/* JSCCB 员工工作台 (PWA)
 * 登录凭证 = HR 创建的工号（localStorage: jsccb:employees）。
 * 信用卡申请来自 jsccb-credit-card（jsccb:applications）。
 * 模块采用注册表模式，新增业务只需往 MODULES 数组追加一项即可扩展。
 */
(function () {
  "use strict";

  var EMP_KEY = "jsccb:employees";
  var APP_KEY = "jsccb:applications";
  var LOAN_KEY = "jsccb:loans";
  var SESSION_KEY = "jsccb:wb_session";
  // 信用卡办理 App 地址（与本站同域 GitHub Pages）
  var CC_APP_URL = "https://jsccb.github.io/jsccb-credit-card/";

  var CARDS = [
    { id: "puka", tier: "A1 · 普卡", cls: "tier-puka", name: "龙卡欢享信用卡银联版" },
    { id: "jinka", tier: "B2 · 金卡", cls: "tier-jinka", name: "龙卡千里行信用卡" },
    { id: "baijin", tier: "C3 · 白金卡", cls: "tier-baijin", name: "龙卡正青春信用卡数字版" },
    { id: "zuanshi", tier: "D4 · 钻石卡", cls: "tier-zuanshi", name: "建行生活卡PLUS版" }
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

  /* ---------- 登录 ---------- */
  function employees() { return load(EMP_KEY); }
  function currentEmp() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function unlock(emp) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(emp));
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("who").textContent = emp.name + "（" + emp.id + "）";
    renderModules();
    showHome();
  }
  function lock() {
    localStorage.removeItem(SESSION_KEY);
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");
    $("emp-input").value = "";
    $("login-error").textContent = "";
  }
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = $("emp-input").value.trim();
    var emp = employees().filter(function (x) { return x.id === id; })[0];
    if (!emp) { $("login-error").textContent = "工号不存在，请先由 HR 创建。"; return; }
    if (emp.status !== "在职") { $("login-error").textContent = "该工号已停用，请联系 HR。"; return; }
    unlock(emp);
  });
  $("logout-btn").addEventListener("click", lock);

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

  /* 信用卡办理：展示卡种 + 跳转客户申请 */
  function renderCcApply() {
    var wrap = document.createElement("div");
    var cards = CARDS.map(function (c) {
      return '<div class="mini-card ' + c.cls + '"><div><div class="mc-tier">' + esc(c.tier) +
        '</div><div class="mc-name">' + esc(c.name) + "</div></div><span>›</span></div>";
    }).join("");
    wrap.innerHTML =
      '<div class="mini-cards">' + cards + "</div>" +
      '<p class="hint">客户申请请使用专用办卡页（含完整身份与资料采集）。</p>' +
      '<button class="btn-primary" id="go-cc">前往客户办卡页</button>';
    wrap.querySelector("#go-cc").addEventListener("click", function () { window.open(CC_APP_URL, "_blank"); });
    return wrap;
  }

  /* 信用卡审核 */
  function renderCcReview() {
    var wrap = document.createElement("div");
    var list = load(APP_KEY);
    if (!list.length) { wrap.innerHTML = '<p class="empty-tip">暂无信用卡申请</p>'; return wrap; }
    wrap.innerHTML = list.slice().reverse().map(function (a) {
      var cls = a.status === "approved" ? "approved" : a.status === "rejected" ? "rejected" : "pending";
      return '<div class="item" data-no="' + esc(a.no) + '">' +
        '<div class="i-head"><span class="i-name">' + esc(a.cardName) + '</span>' +
        '<span class="i-status ' + cls + '">' + statusText(a.status) + "</span></div>" +
        '<div class="i-row">申请编号：' + esc(a.no) + "</div>" +
        '<div class="i-row">申请人：' + esc(a.name) + " / " + esc(a.idno) + "</div>" +
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
        arr.forEach(function (x) { if (x.no === no) x.status = btn.getAttribute("data-act"); });
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
      '<div class="field"><label>贷款金额（元）*</</label><input name="amount" type="number" required /></div>' +
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
        '<div class="i-head"><span class="i-name">' + esc(a.cust) + " · " + esc(a.amount) + "元</span>" +
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

  /* 更多：扩展说明 */
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

  if (currentEmp()) unlock(currentEmp());
})();
