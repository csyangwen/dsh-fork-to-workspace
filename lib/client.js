window.__ModuleLoader__.load({ id: "dsh-fork-to-workspace", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_client = require("react-dom/client");

// src/client/styles.css
var styles_default = "/**\n * dsh-fork-to-workspace \u2014 \u5BA2\u6237\u7AEF\u6837\u5F0F\u3002\n * \u5168\u90E8\u7C7B\u540D\u5E26 fw- \u524D\u7F00\uFF0C\u907F\u514D\u4E0E\u5B98\u65B9 hash \u5316 CSS module \u7C7B\u540D\u51B2\u7A81\u3002\n * \u989C\u8272/\u5B57\u4F53\u4E00\u5F8B\u4F7F\u7528 DSH \u8BBE\u8BA1 token\uFF08\u6DF1\u6D45\u8272\u81EA\u52A8\u9002\u914D\uFF09\uFF0C\u4E0D\u5199\u6B7B\u8272\u503C\u3002\n */\n\n/* ---------- \u6CE8\u5165\u7684\u83DC\u5355\u9879\uFF08\u4EFF\u5B98\u65B9 Menu item\uFF1Amin-h 40 / r10 / pad 10-8\uFF09 ---------- */\n.fw-menuitem {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  min-height: 40px;\n  padding: 8px 10px;\n  box-sizing: border-box;\n  border: none;\n  border-radius: 10px;\n  background: transparent;\n  cursor: pointer;\n  font: inherit;\n  font-size: 14px;\n  line-height: 22px;\n  color: var(--dsw-alias-label-primary);\n  text-align: left;\n}\n\n.fw-menuitem:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.fw-menuitem-icon {\n  display: inline-flex;\n  flex: none;\n  width: 16px;\n  height: 16px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.fw-menuitem-icon svg {\n  width: 16px;\n  height: 16px;\n}\n\n.fw-menuitem-label {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* ---------- \u5206\u652F\u4E8C\u9009\u4E00\u5F39\u5C42\uFF08\u4EFF\u5B98\u65B9\u83DC\u5355\u5361\u7247\uFF1Ar12 / 4px \u5185\u8FB9\u8DDD / lv3 \u9634\u5F71\uFF09 ---------- */\n.fw-popover {\n  position: fixed;\n  z-index: 1100;\n  min-width: 218px;\n  max-width: 360px;\n  box-sizing: border-box;\n  padding: 4px;\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--dsw-alias-border-inverted);\n  border-radius: 12px;\n  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2));\n  box-shadow: var(--dsw-shadow-lv3);\n  font-family: var(--dsw-font-family);\n}\n\n.fw-popover-label {\n  padding: 4px 10px;\n  font-size: 12px;\n  line-height: 16px;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n/* ---------- \u5DE5\u4F5C\u533A\u9009\u62E9\u5BF9\u8BDD\u6846 ---------- */\n.fw-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 1000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--dsw-alias-bg-mask-2, rgba(0, 0, 0, 0.4));\n}\n\n.fw-dialog {\n  width: min(480px, calc(100vw - 48px));\n  max-height: min(640px, calc(100vh - 96px));\n  display: flex;\n  flex-direction: column;\n  box-sizing: border-box;\n  padding: 20px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 16px;\n  background: var(--dsw-alias-bg-layer-1);\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  font-family: var(--dsw-font-family);\n}\n\n.fw-dialog-title {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 0 0 4px;\n  font-size: 16px;\n  line-height: 24px;\n  font-weight: 600;\n}\n\n.fw-dialog-title .fw-menuitem-icon {\n  width: 18px;\n  height: 18px;\n}\n\n.fw-dialog-title .fw-menuitem-icon svg {\n  width: 18px;\n  height: 18px;\n}\n\n.fw-dialog-source {\n  margin: 0 0 12px;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-secondary);\n  word-break: break-all;\n}\n\n.fw-dialog-section {\n  margin: 0 0 8px;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.fw-workspace-list {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-bottom: 16px;\n}\n\n.fw-workspace-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 8px 10px;\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  background: transparent;\n  cursor: pointer;\n  text-align: left;\n  font: inherit;\n  color: var(--dsw-alias-label-primary);\n}\n\n.fw-workspace-row:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.fw-workspace-row.fw-selected {\n  border-color: var(--dsw-alias-brand-primary);\n  background: var(--dsw-alias-interactive-bg-hover-accent);\n}\n\n.fw-workspace-text {\n  flex: 1;\n  min-width: 0;\n}\n\n.fw-workspace-title {\n  font-size: 14px;\n  line-height: 22px;\n}\n\n.fw-workspace-path {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--dsw-alias-label-tertiary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  direction: rtl; /* \u957F\u8DEF\u5F84\u7701\u7565\u53F7\u843D\u5728\u5DE6\u4FA7\uFF0C\u4FDD\u7559\u53EF\u8BFB\u7684\u76EE\u5F55\u5C3E\u90E8 */\n  text-align: left;\n}\n\n.fw-dialog-hint {\n  margin: 0 0 12px;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.fw-dialog-error {\n  margin: 0 0 12px;\n  padding: 8px 10px;\n  border-radius: 8px;\n  background: var(--dsw-alias-interactive-bg-hover-danger);\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  line-height: 20px;\n  word-break: break-word;\n}\n\n.fw-dialog-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n.fw-btn {\n  min-height: 34px;\n  padding: 0 14px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 14px;\n  line-height: 20px;\n  cursor: pointer;\n}\n\n.fw-btn:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.fw-btn-primary {\n  background: var(--dsw-alias-button-primary-fill);\n  border-color: transparent;\n  color: var(--dsw-alias-label-primary-foreground);\n}\n\n.fw-btn-primary:hover:not(:disabled) {\n  background: var(--dsw-alias-button-primary-hover);\n}\n\n.fw-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n/* ---------- \u5BFC\u5165\u4F1A\u8BDD\u5BF9\u8BDD\u6846 ---------- */\n.fw-import-browse {\n  margin-bottom: 8px;\n}\n\n.fw-import-workspace-select {\n  width: 100%;\n  box-sizing: border-box;\n  min-height: 36px;\n  padding: 6px 10px;\n  margin-bottom: 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 13px;\n  line-height: 20px;\n}\n\n.fw-dialog-success {\n  margin: 0 0 12px;\n  padding: 8px 10px;\n  border-radius: 8px;\n  background: var(--dsw-alias-interactive-bg-hover-accent);\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  line-height: 20px;\n  word-break: break-all;\n}\n";

// src/client/texts.ts
function isEnglish() {
  return (document.documentElement.lang ?? "").toLowerCase().startsWith("en");
}
var DICT = {
  "menu.forkToWorkspace": {
    zh: "\u5206\u53C9\u4F1A\u8BDD\u5230\u5176\u4ED6\u5DE5\u4F5C\u533A\u2026",
    en: "Fork session to another workspace\u2026"
  },
  "menu.exportSession": {
    zh: "\u5BFC\u51FA\u4F1A\u8BDD\u2026",
    en: "Export session\u2026"
  },
  "menu.importSession": {
    zh: "\u5BFC\u5165\u4F1A\u8BDD\u5230\u8BE5\u5DE5\u4F5C\u533A\u2026",
    en: "Import session into this workspace\u2026"
  },
  "import.note": {
    zh: "\u5BFC\u5165\u4F1A\u65B0\u589E\u4E00\u4E2A\u72EC\u7ACB\u4F1A\u8BDD\uFF08\u4FDD\u7559 zip \u5185\u7684\u539F\u59CB\u4F1A\u8BDD id\uFF09\uFF0C\u4E0D\u4F1A\u66FF\u6362\u6216\u5220\u9664\u4EFB\u4F55\u73B0\u6709\u4F1A\u8BDD\u3002",
    en: "Importing creates a new independent session (keeping the original session id from the zip). Nothing existing is replaced or deleted."
  },
  "export.failed": {
    zh: "\u5BFC\u51FA\u5931\u8D25\uFF1A{message}",
    en: "Export failed: {message}"
  },
  "import.title": {
    zh: "\u5BFC\u5165\u4F1A\u8BDD",
    en: "Import session"
  },
  "import.file": {
    zh: "\u9009\u62E9\u4F1A\u8BDD\u5305\uFF08dsh-session-*.zip\uFF0C\u7531\u672C\u63D2\u4EF6\u6216\u5B98\u65B9\u5BFC\u51FA\uFF09",
    en: "Choose a session package (dsh-session-*.zip, exported by this plugin)"
  },
  "import.browse": {
    zh: "\u9009\u62E9 zip \u6587\u4EF6",
    en: "Choose zip file"
  },
  "import.picked": {
    zh: "\u5DF2\u9009\u62E9\uFF1A{name}\uFF08{size}\uFF09",
    en: "Selected: {name} ({size})"
  },
  "import.workspace": {
    zh: "\u76EE\u6807\u5DE5\u4F5C\u533A\uFF08\u53EF\u9009\uFF1B\u4E0D\u9009\u5219\u4FDD\u7559\u4F1A\u8BDD\u539F\u6709\u76EE\u5F55\uFF0C\u5BFC\u5165\u540E\u51FA\u73B0\u5728\u300C\u672A\u5206\u7EC4\u300D\uFF09",
    en: "Target workspace (optional; keep the original directory otherwise, session appears under Ungrouped)"
  },
  "import.keep": {
    zh: "\u4FDD\u7559\u539F\u76EE\u5F55\uFF08\u672A\u5206\u7EC4\uFF09",
    en: "Keep original directory (Ungrouped)"
  },
  "import.button": {
    zh: "\u5BFC\u5165",
    en: "Import"
  },
  "import.importing": {
    zh: "\u6B63\u5728\u5BFC\u5165\u2026",
    en: "Importing\u2026"
  },
  "import.success": {
    zh: "\u5BFC\u5165\u6210\u529F\uFF1A{sessionId}\uFF08{events} \u6761\u4E8B\u4EF6\uFF0C{attachments} \u4E2A\u9644\u4EF6\uFF09",
    en: "Imported: {sessionId} ({events} events, {attachments} attachments)"
  },
  "import.copied": {
    zh: "\u539F\u4F1A\u8BDD id {from} \u5DF2\u5B58\u5728\uFF0C\u672C\u6B21\u81EA\u52A8\u590D\u5236\u4E3A\u65B0 id\uFF1A{to}\uFF08\u539F\u4F1A\u8BDD\u672A\u6539\u52A8\uFF09\u3002",
    en: "Session id {from} already existed; imported as a copy with new id: {to} (the original is untouched)."
  },
  "import.failed": {
    zh: "\u5BFC\u5165\u5931\u8D25\uFF1A{message}",
    en: "Import failed: {message}"
  },
  "import.open": {
    zh: "\u6253\u5F00\u4F1A\u8BDD",
    en: "Open session"
  },
  "import.warning": {
    zh: "\u6CE8\u610F\uFF1A\u4F1A\u8BDD\u8BB0\u5F55\u7684 agent preset \u9700\u8981\u5728\u5F53\u524D DSH \u4E2D\u5B58\u5728\uFF08\u5982 anchored-standard\uFF09\uFF0C\u5426\u5219\u6253\u5F00\u4F1A\u5931\u8D25\u3002",
    en: "Note: the session's agent preset must exist in this DSH (e.g. anchored-standard), otherwise opening will fail."
  },
  "branch.menuTitle": {
    zh: "\u514B\u9686\u6B64\u4F1A\u8BDD\u5206\u652F",
    en: "Clone this session branch"
  },
  "branch.toCurrent": {
    zh: "\u514B\u9686\u5230\u5F53\u524D\u5DE5\u4F5C\u533A",
    en: "Clone to current workspace"
  },
  "branch.toOther": {
    zh: "\u514B\u9686\u5230\u5176\u4ED6\u5DE5\u4F5C\u533A\u2026",
    en: "Clone to another workspace\u2026"
  },
  "branch.enabledTip": {
    zh: "\u514B\u9686\u6B64\u8F6E\u5206\u652F\uFF08\u9009\u62E9\u514B\u9686\u65B9\u5F0F\uFF09",
    en: "Clone this branch (choose how to clone)"
  },
  "branch.noSession": {
    zh: "\u65E0\u6CD5\u786E\u5B9A\u5F53\u524D\u4F1A\u8BDD\uFF0C\u8BF7\u91CD\u8BD5",
    en: "Cannot determine the current session. Please retry."
  },
  "dialog.title": {
    zh: "\u5206\u53C9\u4F1A\u8BDD\u5230\u5176\u4ED6\u5DE5\u4F5C\u533A",
    en: "Fork session to another workspace"
  },
  "dialog.source": {
    zh: "\u6E90\u4F1A\u8BDD\uFF1A{name}",
    en: "Source session: {name}"
  },
  "dialog.workspace": {
    zh: "\u76EE\u6807\u5DE5\u4F5C\u533A\uFF08\u70B9\u51FB\u9009\u62E9\uFF09",
    en: "Target workspace (click to select)"
  },
  "dialog.noOtherWorkspace": {
    zh: "\u6CA1\u6709\u5176\u4ED6\u53EF\u7528\u7684\u5DE5\u4F5C\u533A\u3002\u8BF7\u5148\u5728\u5DE6\u4FA7\u300C\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D\u540E\u518D\u8BD5\u3002",
    en: "No other workspace available. Add one in the sidebar first."
  },
  "dialog.cancel": {
    zh: "\u53D6\u6D88",
    en: "Cancel"
  },
  "dialog.confirm": {
    zh: "\u514B\u9686\u5230\u8BE5\u5DE5\u4F5C\u533A",
    en: "Clone to this workspace"
  },
  "dialog.forking": {
    zh: "\u6B63\u5728\u514B\u9686\u2026",
    en: "Cloning\u2026"
  },
  "dialog.opening": {
    zh: "\u5DF2\u514B\u9686\uFF0C\u6B63\u5728\u6253\u5F00\u2026",
    en: "Cloned. Opening\u2026"
  },
  "dialog.failed": {
    zh: "\u514B\u9686\u5931\u8D25\uFF1A{message}",
    en: "Fork failed: {message}"
  },
  "dialog.loadFailed": {
    zh: "\u65E0\u6CD5\u52A0\u8F7D\u5DE5\u4F5C\u533A\u5217\u8868\uFF1A{message}",
    en: "Failed to load workspaces: {message}"
  },
  "dialog.resolveFailed": {
    zh: "\u65E0\u6CD5\u786E\u5B9A\u6E90\u4F1A\u8BDD\u3002\u8BF7\u5728\u5DE6\u4FA7\u4F1A\u8BDD\u5217\u8868\u4E2D\u5148\u9009\u62E9\u8981\u514B\u9686\u7684\u4F1A\u8BDD\uFF0C\u518D\u6253\u5F00\u5B83\u7684\u83DC\u5355\u91CD\u8BD5\u3002",
    en: "Cannot identify the source session. Select it in the sidebar list first, then open its menu again."
  }
};
function t(key, vars) {
  const entry = DICT[key];
  let text = entry === void 0 ? key : isEnglish() ? entry.en : entry.zh;
  if (vars !== void 0) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

// src/client/BranchMenu.tsx
var React = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
function BranchMenu({ x, y, sessionId, seq, onClose, onForkToCurrent, onForkToOther }) {
  const rootRef = React.useRef(null);
  React.useEffect(() => {
    const onPointerDown = (event) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: rootRef,
      className: "fw-popover fw-branch-menu",
      role: "menu",
      style: { left: x, top: y },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fw-popover-label", children: t("branch.menuTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            role: "menuitem",
            className: "fw-menuitem",
            onClick: () => {
              onForkToCurrent(sessionId, seq);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "fw-menuitem-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconBranchOutline16, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "fw-menuitem-label", children: t("branch.toCurrent") })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            role: "menuitem",
            className: "fw-menuitem",
            onClick: () => {
              onForkToOther(sessionId, seq);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "fw-menuitem-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconFolderOpen16, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "fw-menuitem-label", children: t("branch.toOther") })
            ]
          }
        )
      ]
    }
  );
}

// src/client/ForkDialog.tsx
var React2 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
async function waitForSession(ctx, childId, timeoutMs = 6e3) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (ctx.sessions.list.getSnapshot().byId[childId] !== void 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}
function ForkDialog({ sessionId, atSeq, ctx, onClose }) {
  const [phase, setPhase] = React2.useState("loading");
  const [error, setError] = React2.useState("");
  const [sourceTitle, setSourceTitle] = React2.useState(sessionId);
  const [workspaces, setWorkspaces] = React2.useState([]);
  const [selected, setSelected] = React2.useState(null);
  const rootRef = React2.useRef(null);
  React2.useEffect(() => {
    let cancelled = false;
    void fetch(`/dsh-fork-ws/prepare?sessionId=${encodeURIComponent(sessionId)}`).then((res) => res.json()).then((data) => {
      if (cancelled) return;
      if (!data.ok) {
        setPhase("failed");
        setError(data.error);
        return;
      }
      setSourceTitle(data.source.title ?? sessionId);
      setWorkspaces(data.workspaces.filter((workspace) => workspace.workspaceId !== data.source.workspaceId));
      setPhase("ready");
    }).catch((cause) => {
      if (cancelled) return;
      setPhase("failed");
      setError(t("dialog.loadFailed", {
        message: cause instanceof Error ? cause.message : String(cause)
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);
  React2.useEffect(() => {
    const onPointerDown = (event) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  const confirm = () => {
    if (selected === null || phase !== "ready") return;
    setPhase("forking");
    setError("");
    void fetch("/dsh-fork-ws/fork", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        workspaceId: selected,
        ...atSeq === void 0 ? {} : { atSeq }
      })
    }).then((res) => res.json()).then(async (data) => {
      if (!data.ok) {
        setPhase("failed");
        setError(t("dialog.failed", { message: data.error }));
        return;
      }
      setPhase("opening");
      await waitForSession(ctx, data.childId);
      try {
        ctx.sessions.open(data.childId);
      } catch {
      }
      onClose();
    }).catch((cause) => {
      setPhase("failed");
      setError(t("dialog.failed", {
        message: cause instanceof Error ? cause.message : String(cause)
      }));
    });
  };
  const busy = phase === "forking" || phase === "opening";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fw-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { ref: rootRef, className: "fw-dialog", role: "dialog", "aria-modal": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "fw-dialog-title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "fw-menuitem-icon", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconFolderOpen16, {}) }),
      t("dialog.title")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "fw-dialog-source", children: t("dialog.source", { name: sourceTitle }) }),
    phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "fw-dialog-hint", children: "\u2026" }),
    phase === "failed" && error !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fw-dialog-error", children: error }),
    phase === "ready" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fw-dialog-section", children: t("dialog.workspace") }),
      workspaces.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "fw-dialog-hint", children: t("dialog.noOtherWorkspace") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fw-workspace-list", children: workspaces.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: selected === workspace.workspaceId ? "fw-workspace-row fw-selected" : "fw-workspace-row",
          onClick: () => {
            setSelected(workspace.workspaceId);
          },
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "fw-workspace-text", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "fw-workspace-title", children: workspace.title }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "fw-workspace-path", title: workspace.path, children: workspace.path })
          ] })
        },
        workspace.workspaceId
      )) })
    ] }),
    busy && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "fw-dialog-hint", children: phase === "forking" ? t("dialog.forking") : t("dialog.opening") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "fw-dialog-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "fw-btn", onClick: onClose, disabled: busy, children: t("dialog.cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "fw-btn fw-btn-primary",
          onClick: confirm,
          disabled: selected === null || phase !== "ready",
          children: t("dialog.confirm")
        }
      )
    ] })
  ] }) });
}

// src/client/ImportDialog.tsx
var React3 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ImportDialog({ ctx, defaultWorkspaceId, onClose }) {
  const [phase, setPhase] = React3.useState("idle");
  const [error, setError] = React3.useState("");
  const [file, setFile] = React3.useState(null);
  const [workspaceId, setWorkspaceId] = React3.useState(defaultWorkspaceId ?? "");
  const [result, setResult] = React3.useState(null);
  const rootRef = React3.useRef(null);
  const fileInputRef = React3.useRef(null);
  const workspaces = ctx.workspaces.list.getSnapshot().items;
  React3.useEffect(() => {
    const onPointerDown = (event) => {
      if (phase === "importing") return;
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === true) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (phase !== "importing" && event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, onClose]);
  const pickFile = (event) => {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setPhase("idle");
    setError("");
  };
  const runImport = () => {
    if (file === null || phase === "importing") return;
    setPhase("importing");
    setError("");
    const query = workspaceId === "" ? "" : `?workspaceId=${encodeURIComponent(workspaceId)}`;
    void fetch(`/dsh-fork-ws/import${query}`, { method: "POST", body: file }).then((res) => res.json()).then(async (data) => {
      if (!data.ok) {
        setPhase("failed");
        setError(t("import.failed", { message: data.error }));
        return;
      }
      setResult({ sessionId: data.sessionId, ...data.copiedFrom === void 0 ? {} : { copiedFrom: data.copiedFrom }, events: data.eventsImported, attachments: data.attachmentsImported });
      setPhase("done");
      const sessionsRuntime = ctx.sessions;
      await sessionsRuntime.refresh().catch(() => {
      });
    }).catch((cause) => {
      setPhase("failed");
      setError(t("import.failed", {
        message: cause instanceof Error ? cause.message : String(cause)
      }));
    });
  };
  const openImported = async () => {
    if (result === null) return;
    const deadline = Date.now() + 6e3;
    while (Date.now() < deadline) {
      if (ctx.sessions.list.getSnapshot().byId[result.sessionId] !== void 0) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    try {
      ctx.sessions.open(result.sessionId);
      onClose();
    } catch {
      setError(t("import.failed", { message: result.sessionId }));
    }
  };
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { ref: rootRef, className: "fw-dialog", role: "dialog", "aria-modal": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("h2", { className: "fw-dialog-title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "fw-menuitem-icon", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_dsh_client_ui_primitives3.IconDownloadOutline16, {}) }),
      t("import.title")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "fw-dialog-hint", children: t("import.note") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-dialog-section", children: t("import.file") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: ".zip,application/zip",
        onChange: pickFile,
        style: { display: "none" }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "button",
        className: "fw-btn fw-import-browse",
        onClick: () => {
          fileInputRef.current?.click();
        },
        disabled: phase === "importing",
        children: t("import.browse")
      }
    ),
    file !== null && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "fw-dialog-source", children: t("import.picked", {
      name: file.name,
      size: formatSize(file.size)
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-dialog-section", children: t("import.workspace") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "select",
      {
        className: "fw-import-workspace-select",
        value: workspaceId,
        onChange: (event) => {
          setWorkspaceId(event.target.value);
        },
        disabled: phase === "importing",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "", children: t("import.keep") }),
          workspaces.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("option", { value: workspace.workspaceId, children: [
            workspace.title,
            " \u2014 ",
            workspace.path
          ] }, workspace.workspaceId))
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "fw-dialog-hint", children: t("import.warning") }),
    phase === "failed" && error !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-dialog-error", children: error }),
    phase === "done" && result !== null && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-dialog-success", children: t("import.success", {
        sessionId: result.sessionId,
        events: String(result.events),
        attachments: String(result.attachments)
      }) }),
      result.copiedFrom !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fw-dialog-hint", children: t("import.copied", { from: result.copiedFrom, to: result.sessionId }) })
    ] }),
    phase === "importing" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "fw-dialog-hint", children: t("import.importing") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "fw-dialog-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "fw-btn",
          onClick: onClose,
          disabled: phase === "importing",
          children: t("dialog.cancel")
        }
      ),
      phase === "done" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "fw-btn fw-btn-primary", onClick: () => {
        void openImported();
      }, children: t("import.open") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "fw-btn fw-btn-primary",
          onClick: runImport,
          disabled: file === null || phase === "importing",
          children: phase === "importing" ? t("import.importing") : t("import.button")
        }
      )
    ] })
  ] }) });
}

// src/client/index.ts
var inject = ["sessions", "workspaces"];
var BRANCH_PATTERNS = ["\u5728\u65B0\u5BF9\u8BDD\u4E2D\u5206\u652F", "Branch into a new conversation"];
var FORK_ITEM_PATTERNS = ["\u5206\u53C9\u4F1A\u8BDD", "Fork session"];
var SESSION_ARIA_PREFIXES = ["\u4F1A\u8BDD\u201C", "Session actions for "];
var WORKSPACE_ARIA_PREFIXES = ["\u5DE5\u4F5C\u533A\u201C", "Workspace actions for "];
var DELETE_WORKSPACE_PATTERNS = ["\u5220\u9664\u5DE5\u4F5C\u533A", "Delete workspace"];
var MENU_INJECTED_ATTR = "data-fw-menu-injected";
var BRANCH_ENABLED_ATTR = "data-fw-branch-enabled";
var BRANCH_ICON_SVG = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M13.0762 1.37207C14.0846 1.37228 14.9021 2.19077 14.9023 3.19922C14.9022 4.20772 14.0847 5.02518 13.0762 5.02539C12.2967 5.02539 11.6325 4.53691 11.3701 3.84961H4.35547C4.79397 4.26458 5.15861 4.7644 5.41699 5.33496L7.10645 9.06738C7.88526 10.7875 9.55104 11.9228 11.4189 12.0371C11.7085 11.4109 12.3411 10.9756 13.0762 10.9756C14.0843 10.9759 14.9023 11.7936 14.9023 12.8018C14.9023 13.81 14.0843 14.6277 13.0762 14.6279C12.2534 14.6279 11.5574 14.0832 11.3291 13.335C8.9868 13.1879 6.89981 11.7612 5.92285 9.60352L4.23242 5.87109C3.67503 4.64033 2.44878 3.84961 1.09766 3.84961V2.54883C1.10665 2.54883 1.11601 2.54975 1.125 2.5498L11.3701 2.54883C11.6326 1.86151 12.2969 1.37207 13.0762 1.37207ZM13.0762 12.2764C12.7858 12.2764 12.5508 12.5114 12.5508 12.8018C12.5508 13.0921 12.7858 13.3281 13.0762 13.3281C13.3664 13.3279 13.6025 13.092 13.6025 12.8018C13.6025 12.5115 13.3664 12.2766 13.0762 12.2764ZM13.0762 2.67285C12.7855 2.67285 12.55 2.90861 12.5498 3.19922C12.5499 3.48987 12.7855 3.72559 13.0762 3.72559C13.3667 3.72538 13.6024 3.48975 13.6025 3.19922C13.6023 2.90874 13.3666 2.67306 13.0762 2.67285Z" fill="currentColor"/></svg>';
var DOWNLOAD_ICON_SVG = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15.3695 11.411L15.1234 12.8866C14.8869 14.3042 13.6603 15.3436 12.223 15.3436H3.77673C2.33958 15.3434 1.1128 14.3042 0.876343 12.8866L0.630249 11.411L2.05408 11.1747L2.29919 12.6493C2.41973 13.3713 3.04475 13.9001 3.77673 13.9003H12.223C12.9551 13.9002 13.58 13.3713 13.7006 12.6493L13.9457 11.1747L15.3695 11.411ZM8.72205 8.994C8.77717 8.93934 8.83792 8.88106 8.90271 8.81627L12.4828 5.23424L13.5043 6.25572L9.92224 9.8358C9.6395 10.1185 9.38763 10.3732 9.15857 10.5575C8.91892 10.7503 8.63953 10.9224 8.2865 10.9784C8.09711 11.0083 7.90363 11.0083 7.71423 10.9784C7.36106 10.9224 7.0809 10.7503 6.84119 10.5575C6.61215 10.3732 6.36022 10.1185 6.07751 9.8358L2.49646 6.25572L3.51697 5.23424L7.09705 8.81627C7.16219 8.88142 7.22331 8.94006 7.27869 8.99498V1.3065H8.72205V8.994Z" fill="currentColor"/></svg>';
function isBranchButton(button) {
  const text = `${button.getAttribute("title") ?? ""} ${button.getAttribute("aria-label") ?? ""}`;
  return BRANCH_PATTERNS.some((pattern) => text.includes(pattern));
}
function parseMessageSeq(node) {
  const match = /^node:(\d+)$/u.exec(node.getAttribute("data-chat-anchor-key") ?? "");
  if (match === null) return null;
  const seq = Number(match[1]);
  return Number.isInteger(seq) && seq >= 1 ? seq : null;
}
function resolveBranchSeq(ctx, sessionId, button) {
  const tail = button.closest("[data-turn-tail]");
  if (tail !== null) {
    const turn = Number(tail.getAttribute("data-turn-tail"));
    if (Number.isInteger(turn) && turn >= 1) {
      const session = ctx.sessions.binding(sessionId)?.session;
      const turnEnd = session?.getSnapshot().turnEnds.get(turn);
      if (typeof turnEnd === "number") return turnEnd;
    }
  }
  const node = button.closest('[data-chat-anchor-key^="node:"]');
  return node === null ? null : parseMessageSeq(node);
}
function findMenuItem(menu, patterns) {
  for (const item of menu.querySelectorAll('[role="menuitem"]')) {
    const label = (item.textContent ?? "").trim();
    if (patterns.some((pattern) => label === pattern)) return item;
  }
  return null;
}
function closeOpenMenu() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}
function resolveSessionIdFromRow(ctx, row) {
  if (row === null) return null;
  const list = ctx.sessions.list.getSnapshot();
  const ariaLabel = row.querySelector("button[aria-label]")?.getAttribute("aria-label") ?? "";
  let candidates = Object.values(list.byId).filter((summary) => summary.displayTitle !== void 0 && summary.displayTitle !== "" && ariaLabel.includes(summary.displayTitle));
  if (candidates.length === 0) return null;
  if (list.current !== void 0 && candidates.some((summary) => summary.id === list.current)) {
    return list.current;
  }
  const section = row.parentElement;
  const workspaceRow = section?.querySelector(':scope > [role="treeitem"][aria-expanded]');
  if (workspaceRow !== null && workspaceRow !== void 0) {
    const workspaceLabel = workspaceRow.querySelector("button[aria-label]")?.getAttribute("aria-label") ?? "";
    const workspaceMatches = ctx.workspaces.list.getSnapshot().items.filter((workspace) => workspace.title !== void 0 && workspace.title !== "" && workspaceLabel.includes(workspace.title));
    if (workspaceMatches.length === 1) {
      const inWorkspace = candidates.filter((summary) => summary.cwd === workspaceMatches[0].path);
      if (inWorkspace.length === 1) return inWorkspace[0].id;
      if (inWorkspace.length > 0) candidates = inWorkspace;
    }
  }
  return candidates.length === 1 ? candidates[0].id : null;
}
function injectSessionMenuItems(ctx, getRow) {
  for (const menu of document.querySelectorAll('[role="menu"]')) {
    if (menu.hasAttribute(MENU_INJECTED_ATTR)) continue;
    const forkItem = findMenuItem(menu, FORK_ITEM_PATTERNS);
    if (forkItem === null) continue;
    menu.setAttribute(MENU_INJECTED_ATTR, "");
    const forkToWorkspaceItem = document.createElement("button");
    forkToWorkspaceItem.type = "button";
    forkToWorkspaceItem.setAttribute("role", "menuitem");
    forkToWorkspaceItem.className = "fw-menuitem";
    forkToWorkspaceItem.innerHTML = `<span class="fw-menuitem-icon">${BRANCH_ICON_SVG}</span><span class="fw-menuitem-label">${t("menu.forkToWorkspace")}</span>`;
    forkToWorkspaceItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOpenMenu();
      const sessionId = resolveSessionIdFromRow(ctx, getRow());
      if (sessionId === null) {
        window.alert(t("dialog.resolveFailed"));
        return;
      }
      openForkDialog(ctx, { sessionId });
    });
    const exportItem = document.createElement("button");
    exportItem.type = "button";
    exportItem.setAttribute("role", "menuitem");
    exportItem.className = "fw-menuitem";
    exportItem.innerHTML = `<span class="fw-menuitem-icon">${DOWNLOAD_ICON_SVG}</span><span class="fw-menuitem-label">${t("menu.exportSession")}</span>`;
    exportItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOpenMenu();
      const sessionId = resolveSessionIdFromRow(ctx, getRow());
      if (sessionId === null) {
        window.alert(t("dialog.resolveFailed"));
        return;
      }
      downloadSessionZip(sessionId);
    });
    forkItem.after(forkToWorkspaceItem, exportItem);
  }
}
function resolveWorkspaceIdFromRow(ctx, row) {
  if (row === null) return null;
  const label = row.querySelector("button[aria-label]")?.getAttribute("aria-label") ?? "";
  const matches = ctx.workspaces.list.getSnapshot().items.filter((workspace) => workspace.title !== void 0 && workspace.title !== "" && label.includes(workspace.title));
  return matches.length === 1 ? matches[0].workspaceId : null;
}
function injectWorkspaceMenuItems(ctx, getRow) {
  for (const menu of document.querySelectorAll('[role="menu"]')) {
    if (menu.hasAttribute(MENU_INJECTED_ATTR)) continue;
    const deleteItem = findMenuItem(menu, DELETE_WORKSPACE_PATTERNS);
    if (deleteItem === null) continue;
    menu.setAttribute(MENU_INJECTED_ATTR, "");
    const importItem = document.createElement("button");
    importItem.type = "button";
    importItem.setAttribute("role", "menuitem");
    importItem.className = "fw-menuitem";
    importItem.innerHTML = `<span class="fw-menuitem-icon">${DOWNLOAD_ICON_SVG}</span><span class="fw-menuitem-label">${t("menu.importSession")}</span>`;
    importItem.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOpenMenu();
      const defaultWorkspaceId = resolveWorkspaceIdFromRow(ctx, getRow());
      openImportDialog(ctx, defaultWorkspaceId === null ? void 0 : defaultWorkspaceId);
    });
    deleteItem.after(importItem);
  }
}
async function downloadSessionZip(sessionId) {
  try {
    const res = await fetch(`/dsh-fork-ws/export?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      window.alert(t("export.failed", { message: body?.error ?? `HTTP ${res.status}` }));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dsh-session-${sessionId}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2e3);
  } catch (cause) {
    window.alert(t("export.failed", {
      message: cause instanceof Error ? cause.message : String(cause)
    }));
  }
}
function enableBranchButtons() {
  const flow = document.querySelector("[data-chat-flow]");
  if (flow === null) return;
  for (const bubble of flow.querySelectorAll('[role="tooltip"]')) {
    const prev = bubble.previousElementSibling;
    if (prev instanceof HTMLButtonElement && prev.hasAttribute(BRANCH_ENABLED_ATTR)) {
      bubble.style.display = "none";
    }
  }
  for (const button of flow.querySelectorAll("button")) {
    if (!isBranchButton(button)) continue;
    if (button.getAttribute("aria-disabled") !== "true" && !button.disabled) continue;
    if (button.hasAttribute(BRANCH_ENABLED_ATTR)) continue;
    button.setAttribute(BRANCH_ENABLED_ATTR, "");
    button.removeAttribute("aria-disabled");
    button.removeAttribute("disabled");
    button.removeAttribute("data-unavailable");
    button.title = t("branch.enabledTip");
    button.setAttribute("aria-label", t("branch.enabledTip"));
  }
}
function showBranchMenu(ctx, anchor, sessionId, seq) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  const close = () => {
    root.unmount();
    host.remove();
  };
  const rect = anchor.getBoundingClientRect();
  root.render((0, import_react.createElement)(BranchMenu, {
    x: rect.left,
    y: rect.bottom + 4,
    sessionId,
    seq,
    onClose: close,
    // 克隆到当前工作区：官方客户端 fork 通道（同工作区、标题自增、打开子会话）。
    onForkToCurrent: (sid, s) => {
      close();
      ctx.sessions.fork({ sessionId: sid, atSeq: s, increaseTitle: true }).then((childId) => {
        ctx.sessions.open(childId);
      }).catch((cause) => {
        window.alert(cause instanceof Error ? cause.message : String(cause));
      });
    },
    // 克隆到其他工作区：打开工作区选择对话框（带 atSeq 锚点）。
    onForkToOther: (sid, s) => {
      close();
      openForkDialog(ctx, { sessionId: sid, atSeq: s });
    }
  }));
}
function openForkDialog(ctx, opts) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  root.render((0, import_react.createElement)(ForkDialog, {
    ...opts,
    ctx,
    onClose: () => {
      root.unmount();
      host.remove();
    }
  }));
}
function openImportDialog(ctx, defaultWorkspaceId) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  root.render((0, import_react.createElement)(ImportDialog, {
    ctx,
    ...defaultWorkspaceId === void 0 ? {} : { defaultWorkspaceId },
    onClose: () => {
      root.unmount();
      host.remove();
    }
  }));
}
function apply(ctx) {
  const styleEl = document.createElement("style");
  styleEl.textContent = styles_default;
  document.head.appendChild(styleEl);
  ctx.effect(() => () => {
    styleEl.remove();
  });
  let lastSessionRow = null;
  let lastWorkspaceRow = null;
  const onRowClickCapture = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (button === null) return;
    const label = button.getAttribute("aria-label") ?? "";
    if (SESSION_ARIA_PREFIXES.some((prefix) => label.startsWith(prefix))) {
      lastSessionRow = button.closest('[role="treeitem"]');
      return;
    }
    if (WORKSPACE_ARIA_PREFIXES.some((prefix) => label.startsWith(prefix))) {
      lastWorkspaceRow = button.closest('[role="treeitem"]');
    }
  };
  document.addEventListener("click", onRowClickCapture, true);
  ctx.effect(() => () => document.removeEventListener("click", onRowClickCapture, true));
  const onBranchClickCapture = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (button === null) return;
    if (!isBranchButton(button)) return;
    if (button.closest("[data-chat-flow]") === null) return;
    const current = ctx.sessions.list.getSnapshot().current;
    if (current === void 0) return;
    const seq = resolveBranchSeq(ctx, current, button);
    if (seq === null) return;
    event.preventDefault();
    event.stopPropagation();
    showBranchMenu(ctx, button, current, seq);
  };
  document.addEventListener("click", onBranchClickCapture, true);
  ctx.effect(() => () => document.removeEventListener("click", onBranchClickCapture, true));
  let disposed = false;
  let raf = 0;
  const scan = () => {
    raf = 0;
    if (disposed) return;
    injectSessionMenuItems(ctx, () => lastSessionRow);
    injectWorkspaceMenuItems(ctx, () => lastWorkspaceRow);
    enableBranchButtons();
  };
  const observer = new MutationObserver(() => {
    if (raf !== 0) return;
    raf = window.requestAnimationFrame(scan);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  ctx.effect(() => () => {
    disposed = true;
    observer.disconnect();
    if (raf !== 0) window.cancelAnimationFrame(raf);
  });
  scan();
}
return module.exports; } });
