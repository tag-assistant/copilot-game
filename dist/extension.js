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
  let idleTimeout;
  let lastErrorCount = 0;
  let lastWarningCount = 0;
  function post(event) {
    panel.webview.postMessage(event);
    if (idleTimeout)
      clearTimeout(idleTimeout);
    if (event.type !== "idle") {
      idleTimeout = setTimeout(() => post({ type: "idle" }), 5e3);
    }
  }
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        post({ type: "fileOpen", file: vscode.workspace.asRelativePath(editor.document.uri) });
      }
    })
  );
  let changeDebounce;
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0)
        return;
      if (changeDebounce)
        clearTimeout(changeDebounce);
      changeDebounce = setTimeout(() => {
        post({ type: "fileChange", file: vscode.workspace.asRelativePath(e.document.uri) });
      }, 100);
    })
  );
  disposables.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      post({ type: "fileSave", file: vscode.workspace.asRelativePath(doc.uri) });
    })
  );
  disposables.push(
    vscode.window.onDidOpenTerminal(() => post({ type: "terminal" }))
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => post({ type: "terminal" }))
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
        post({ type: "errorsAppear", errorCount: errorCount - lastErrorCount });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        post({ type: "errorsCleared" });
      }
      if (warningCount > lastWarningCount) {
        post({ type: "warningsAppear", warningCount: warningCount - lastWarningCount });
      }
      lastErrorCount = errorCount;
      lastWarningCount = warningCount;
    })
  );
  try {
    disposables.push(
      vscode.commands.registerCommand("copilotGame.internalCopilotDetect", () => {
        post({ type: "copilotAssist" });
      })
    );
  } catch {
  }
  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.type === "saveStats") {
      context.globalState.update("copilotGame.stats", msg.stats);
    }
  }, void 0, disposables);
  const savedStats = context.globalState.get("copilotGame.stats");
  if (savedStats) {
    setTimeout(() => {
      panel.webview.postMessage({ type: "loadStats", stats: savedStats });
    }, 600);
  }
  setTimeout(() => {
    const config = vscode.workspace.getConfiguration("copilotGame");
    panel.webview.postMessage({
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
        panel.webview.postMessage({
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
  idleTimeout = setTimeout(() => post({ type: "idle" }), 5e3);
  return disposables;
}

// src/extension.ts
var currentPanel;
var statusBarItem;
function activate(context) {
  statusBarItem = vscode2.window.createStatusBarItem(vscode2.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(smiley) Mona";
  statusBarItem.tooltip = "Click to open Copilot Game";
  statusBarItem.command = "copilotGame.open";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  const openCmd = vscode2.commands.registerCommand("copilotGame.open", () => {
    if (currentPanel) {
      currentPanel.reveal();
      return;
    }
    const config2 = vscode2.workspace.getConfiguration("copilotGame");
    const panel = vscode2.window.createWebviewPanel(
      "copilotGame",
      "\u{1F431} Mona's Adventure",
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
    setTimeout(() => {
      const editor = vscode2.window.activeTextEditor;
      if (editor) {
        panel.webview.postMessage({
          type: "fileOpen",
          file: vscode2.workspace.asRelativePath(editor.document.uri)
        });
      }
    }, 500);
  });
  context.subscriptions.push(openCmd);
  const config = vscode2.workspace.getConfiguration("copilotGame");
  if (config.get("autoOpen", false)) {
    vscode2.commands.executeCommand("copilotGame.open");
  }
  let lastEdit = 0;
  context.subscriptions.push(
    vscode2.workspace.onDidChangeTextDocument((e) => {
      if (!currentPanel)
        return;
      const now = Date.now();
      for (const change of e.contentChanges) {
        if (change.text.length > 20 && now - lastEdit > 200) {
          currentPanel.webview.postMessage({ type: "copilotAssist" });
          break;
        }
      }
      lastEdit = now;
    })
  );
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
    #streak { color: #f39c12; font-weight: bold; min-width: 50px; text-align: right; }
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
      <span id="state-icon">\u{1F60A}</span>
      <span id="level">Lv.1</span>
      <span id="file">\u{1F4C1} Ready</span>
      <span id="status">\u{1F431} Mona is ready!</span>
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
