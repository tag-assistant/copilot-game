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
function createEventListeners(panel) {
  const disposables = [];
  let idleTimeout;
  let lastErrorCount = 0;
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
    vscode.window.onDidOpenTerminal(() => {
      post({ type: "terminal" });
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      post({ type: "terminal" });
    })
  );
  disposables.push(
    vscode.languages.onDidChangeDiagnostics(() => {
      const allDiags = vscode.languages.getDiagnostics();
      let errorCount = 0;
      for (const [, diags] of allDiags) {
        errorCount += diags.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
      }
      if (errorCount > lastErrorCount) {
        post({ type: "errorsAppear", errorCount: errorCount - lastErrorCount });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        post({ type: "errorsCleared" });
      }
      lastErrorCount = errorCount;
    })
  );
  idleTimeout = setTimeout(() => post({ type: "idle" }), 5e3);
  return disposables;
}

// src/extension.ts
function activate(context) {
  const cmd = vscode2.commands.registerCommand("copilotGame.open", () => {
    const panel = vscode2.window.createWebviewPanel(
      "copilotGame",
      "\u{1F431} Mona's Adventure",
      vscode2.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.webview.html = getWebviewContent(panel.webview, context);
    const listeners = createEventListeners(panel);
    panel.onDidDispose(() => listeners.forEach((d) => d.dispose()));
    context.subscriptions.push(...listeners);
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
  context.subscriptions.push(cmd);
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
      gap: 12px;
    }
    #file { color: #3498db; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #status { color: #a0a0c0; flex: 1; text-align: center; }
    #streak { color: #f39c12; font-weight: bold; min-width: 50px; text-align: right; }
  </style>
</head>
<body>
  <div id="game-container">
    <canvas id="game"></canvas>
    <div id="hud">
      <span id="file">\u{1F4C1} Ready</span>
      <span id="status">\u{1F431} Mona is ready!</span>
      <span id="streak"></span>
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
