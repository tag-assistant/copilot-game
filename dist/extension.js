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

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));

// src/events.ts
var vscode = __toESM(require("vscode"));
function createEventListeners(panel, context) {
  const disposables = [];
  let lastUserCursorMove = 0;
  let lastUserFocusedDoc;
  let lastActiveEditorUri;
  let agentState = "IDLE";
  let lastAgentSignal = 0;
  let agentIdleTimeout;
  let fullIdleTimeout;
  let sessionStart = 0;
  const sessionFiles = /* @__PURE__ */ new Set();
  let sessionLinesWritten = 0;
  let sessionLinesDeleted = 0;
  let sessionTerminalCmds = 0;
  let sessionErrorsEncountered = 0;
  let sessionErrorsFixed = 0;
  let recentEditFiles = [];
  let lastErrorCount = 0;
  let lastWarningCount = 0;
  function post(event) {
    panel.webview.postMessage(event);
  }
  function setAgentState(newState) {
    if (newState === agentState)
      return;
    const prev = agentState;
    agentState = newState;
    if (newState === "COPILOT_ACTIVE" && prev === "IDLE") {
      sessionStart = Date.now();
      sessionFiles.clear();
      sessionLinesWritten = 0;
      sessionLinesDeleted = 0;
      sessionTerminalCmds = 0;
      sessionErrorsEncountered = 0;
      sessionErrorsFixed = 0;
    }
    if (newState === "IDLE" && (prev === "COPILOT_IDLE" || prev === "COPILOT_ACTIVE")) {
      if (sessionFiles.size > 0) {
        post({
          type: "sessionSummary",
          summary: {
            filesVisited: [...sessionFiles],
            linesWritten: sessionLinesWritten,
            linesDeleted: sessionLinesDeleted,
            terminalCommands: sessionTerminalCmds,
            errorsEncountered: sessionErrorsEncountered,
            errorsFixed: sessionErrorsFixed,
            durationMs: Date.now() - sessionStart
          }
        });
      }
    }
    post({ type: "agentStateChange", agentState: newState });
    resetTimers();
  }
  function resetTimers() {
    if (agentIdleTimeout)
      clearTimeout(agentIdleTimeout);
    if (fullIdleTimeout)
      clearTimeout(fullIdleTimeout);
    if (agentState === "COPILOT_ACTIVE") {
      agentIdleTimeout = setTimeout(() => setAgentState("COPILOT_IDLE"), 5e3);
    } else if (agentState === "COPILOT_IDLE") {
      fullIdleTimeout = setTimeout(() => setAgentState("IDLE"), 15e3);
    }
  }
  function signalAgent() {
    lastAgentSignal = Date.now();
    if (agentState === "IDLE" || agentState === "COPILOT_IDLE") {
      setAgentState("COPILOT_ACTIVE");
    } else if (agentState === "COPILOT_ACTIVE") {
      resetTimers();
    }
  }
  function isUserActive() {
    return Date.now() - lastUserCursorMove < 500;
  }
  disposables.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      lastUserCursorMove = Date.now();
      lastUserFocusedDoc = e.textEditor.document.uri.toString();
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        lastActiveEditorUri = editor.document.uri.toString();
      }
    })
  );
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0)
        return;
      if (e.document.uri.scheme !== "file")
        return;
      const docUri = e.document.uri.toString();
      const relPath = vscode.workspace.asRelativePath(e.document.uri);
      const now = Date.now();
      let totalInserted = 0;
      let totalDeleted = 0;
      let linesInserted = 0;
      let linesRemoved = 0;
      for (const change of e.contentChanges) {
        totalInserted += change.text.length;
        totalDeleted += change.rangeLength;
        linesInserted += (change.text.match(/\n/g) || []).length;
        linesRemoved += change.range.end.line - change.range.start.line;
      }
      const isBackgroundEdit = docUri !== lastActiveEditorUri;
      const isLargeBlock = totalInserted > 20;
      const isCursorInactive = now - lastUserCursorMove > 300;
      const isNotUserTyping = !isUserActive() || isBackgroundEdit;
      recentEditFiles.push({ uri: docUri, time: now });
      recentEditFiles = recentEditFiles.filter((f) => now - f.time < 2e3);
      const uniqueRecentFiles = new Set(recentEditFiles.map((f) => f.uri)).size;
      const isMultiFileRapid = uniqueRecentFiles >= 2;
      let agentScore = 0;
      if (isBackgroundEdit)
        agentScore += 3;
      if (isLargeBlock)
        agentScore += 2;
      if (isCursorInactive)
        agentScore += 1;
      if (isMultiFileRapid)
        agentScore += 2;
      if (agentScore >= 2 && isNotUserTyping) {
        signalAgent();
        sessionFiles.add(relPath);
        if (totalDeleted > totalInserted && totalDeleted > 10) {
          sessionLinesDeleted += Math.max(1, linesRemoved);
          post({ type: "agentCodeDelete", file: relPath, linesDeleted: Math.max(1, linesRemoved) });
        } else {
          sessionLinesWritten += Math.max(1, linesInserted);
          post({ type: "agentFileEdit", file: relPath, linesChanged: Math.max(1, linesInserted) });
        }
      }
    })
  );
  disposables.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.uri.scheme !== "file")
        return;
      const docUri = doc.uri.toString();
      setTimeout(() => {
        if (docUri !== lastActiveEditorUri) {
          const relPath = vscode.workspace.asRelativePath(doc.uri);
          signalAgent();
          sessionFiles.add(relPath);
          post({ type: "agentFileOpen", file: relPath });
        }
      }, 100);
    })
  );
  disposables.push(
    vscode.workspace.onDidCreateFiles((e) => {
      for (const file of e.files) {
        const relPath = vscode.workspace.asRelativePath(file);
        signalAgent();
        sessionFiles.add(relPath);
        post({ type: "agentFileCreate", file: relPath });
      }
    })
  );
  disposables.push(
    vscode.window.onDidOpenTerminal(() => {
      const activeTerminal = vscode.window.activeTerminal;
      if (!activeTerminal) {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: "agentTerminal" });
      }
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      if (!isUserActive()) {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: "agentTerminal" });
      }
    })
  );
  disposables.push(
    vscode.languages.onDidChangeDiagnostics(() => {
      const allDiags = vscode.languages.getDiagnostics();
      let errorCount = 0;
      let warningCount = 0;
      for (const [, diags] of allDiags) {
        for (const d of diags) {
          if (d.severity === vscode.DiagnosticSeverity.Error)
            errorCount++;
          else if (d.severity === vscode.DiagnosticSeverity.Warning)
            warningCount++;
        }
      }
      if (errorCount > lastErrorCount) {
        const newErrors = errorCount - lastErrorCount;
        sessionErrorsEncountered += newErrors;
        post({ type: "errorsAppear", errorCount: newErrors });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        sessionErrorsFixed += lastErrorCount;
        post({ type: "errorsCleared" });
      }
      if (warningCount > lastWarningCount) {
        post({ type: "warningsAppear", warningCount: warningCount - lastWarningCount });
      }
      lastErrorCount = errorCount;
      lastWarningCount = warningCount;
    })
  );
  panel.webview.onDidReceiveMessage(
    (msg) => {
      if (msg.type === "saveStats") {
        context.globalState.update("copilotGame.stats", msg.stats);
      }
    },
    void 0,
    disposables
  );
  const savedStats = context.globalState.get("copilotGame.stats");
  if (savedStats) {
    setTimeout(() => panel.webview.postMessage({ type: "loadStats", stats: savedStats }), 600);
  }
  setTimeout(() => {
    const config = vscode.workspace.getConfiguration("copilotGame");
    post({
      type: "configUpdate",
      config: {
        soundEnabled: config.get("soundEnabled", false),
        monaSize: config.get("monaSize", 64),
        showXPBar: config.get("showXPBar", true)
      }
    });
  }, 300);
  disposables.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("copilotGame")) {
        const config = vscode.workspace.getConfiguration("copilotGame");
        post({
          type: "configUpdate",
          config: {
            soundEnabled: config.get("soundEnabled", false),
            monaSize: config.get("monaSize", 64),
            showXPBar: config.get("showXPBar", true)
          }
        });
      }
    })
  );
  post({ type: "agentStateChange", agentState: "IDLE" });
  return disposables;
}

// src/extension.ts
var currentPanel;
var statusBarItem;
function activate(context) {
  statusBarItem = vscode2.window.createStatusBarItem(vscode2.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(smiley) Mona";
  statusBarItem.tooltip = "Open Copilot Game \u2014 Watch Copilot work!";
  statusBarItem.command = "copilotGame.open";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  const openCmd = vscode2.commands.registerCommand("copilotGame.open", () => {
    if (currentPanel) {
      currentPanel.reveal();
      return;
    }
    const panel = vscode2.window.createWebviewPanel(
      "copilotGame",
      "\u{1F431} Mona \u2014 Copilot Visualizer",
      vscode2.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    currentPanel = panel;
    panel.webview.html = getWebviewContent(panel.webview, context);
    const listeners = createEventListeners(panel, context);
    panel.onDidDispose(() => {
      listeners.forEach((d) => d.dispose());
      currentPanel = void 0;
      statusBarItem.text = "$(smiley) Mona";
    });
    context.subscriptions.push(...listeners);
    statusBarItem.text = "$(smiley) Mona \u{1F3AE}";
  });
  context.subscriptions.push(openCmd);
  const config = vscode2.workspace.getConfiguration("copilotGame");
  if (config.get("autoOpen", false)) {
    vscode2.commands.executeCommand("copilotGame.open");
  }
}
function getWebviewContent(webview, context) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(
    vscode2.Uri.joinPath(context.extensionUri, "dist", "webview.js")
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d0d1a;
      overflow: hidden;
      font-family: 'Courier New', monospace;
      color: #a0a0c0;
    }
    #game-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #xp-bar {
      height: 4px;
      background: #1a1a2e;
      width: 100%;
      position: relative;
    }
    #xp-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #3498db, #2ecc71, #f1c40f);
      transition: width 0.3s ease;
      border-radius: 0 2px 2px 0;
    }
    canvas {
      flex: 1;
      width: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    #hud {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 12px;
      background: #1a1a2e;
      border-top: 2px solid #2d2d5e;
      font-size: 11px;
      height: 36px;
      gap: 8px;
    }
    #state-icon { font-size: 14px; min-width: 20px; }
    #level {
      color: #f1c40f;
      font-weight: bold;
      min-width: 40px;
      font-size: 10px;
    }
    #file { color: #3498db; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #status { color: #a0a0c0; flex: 1; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #streak { color: #58a6ff; font-weight: bold; min-width: 80px; text-align: right; font-size: 10px; }
    #stats-tooltip {
      color: #7a7a9e;
      font-size: 9px;
      position: absolute;
      bottom: 40px;
      left: 12px;
      background: #1a1a2eee;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #2d2d5e;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    #hud:hover #stats-tooltip { opacity: 1; }
  </style>
</head>
<body>
  <div id="game-container">
    <div id="xp-bar"><div id="xp-bar-fill"></div></div>
    <canvas id="game"></canvas>
    <div id="hud">
      <span id="state-icon">\u{1F634}</span>
      <span id="level">Lv.1</span>
      <span id="file">\u{1F4C1} Ready</span>
      <span id="status">\u{1F634} Waiting for Copilot...</span>
      <span id="streak"></span>
      <div id="stats-tooltip"></div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
