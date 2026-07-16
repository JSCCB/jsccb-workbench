# JSCCB · 员工工作台（jsccb-workbench）

银行员工移动工作台（PWA），以 **工号** 作为登录凭证，内置可扩展业务模块。

## 登录
- 使用 HR 管理系统（jsccb-hr）创建的工号登录。
- 工号读取自 `localStorage` 键 `jsccb:employees`（与 HR 系统同域共享）。
- 工号不存在 / 已停用 → 拒绝登录。

## 业务模块（注册表模式，可扩展）
| 模块 | 说明 |
|------|------|
| 💳 信用卡办理 | 展示卡种并跳转客户办卡页（jsccb-credit-card） |
| ✅ 信用卡审核 | 审批来自办卡页的申请（`jsccb:applications`，待审/通过/拒绝） |
| 💰 贷款办理 | 录入客户贷款申请 → `jsccb:loans` |
| 📋 贷款审核 | 审批贷款申请 |
| ➕ 更多模块 | 扩展示例（在 `MODULES` 数组追加即可） |

**扩展方式**：编辑 `assets/js/app.js`，往 `MODULES` 数组追加 `{ id, name, icon, desc, badge, render }`，模块自动出现在首页宫格，无需改动其他代码。

## 数据联动
三仓库部署到同一 GitHub Pages 域名 `jsccb.github.io` 后共享 localStorage：
- `jsccb-hr` 创建工号 → `jsccb-workbench` 用作登录凭证
- `jsccb-credit-card` 客户申请 → `jsccb-workbench` 「信用卡审核」审批

## PWA
已配置 `manifest.webmanifest` 与 `sw.js`，可「添加到主屏幕」离线使用。

## 本地运行
```bash
python -m http.server 8082
# 打开 http://localhost:8082
```
