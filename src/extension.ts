import * as vscode from 'vscode';
import { createEventListeners } from './events';

let currentPanel: vscode.WebviewPanel | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(smiley) Mona';
  statusBarItem.tooltip = 'Open Copilot Game — Watch Copilot work!';
  statusBarItem.command = 'copilotGame.open';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const openCmd = vscode.commands.registerCommand('copilotGame.open', () => {
    if (currentPanel) {
      currentPanel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'copilotGame',
      '🐱 Mona — Copilot Visualizer',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    currentPanel = panel;
    panel.webview.html = getWebviewContent(panel.webview, context);

    const listeners = createEventListeners(panel, context);
    panel.onDidDispose(() => {
      listeners.forEach(d => d.dispose());
      currentPanel = undefined;
      statusBarItem.text = '$(smiley) Mona';
    });
    context.subscriptions.push(...listeners);

    statusBarItem.text = '$(smiley) Mona 🎮';
  });

  context.subscriptions.push(openCmd);

  const config = vscode.workspace.getConfiguration('copilotGame');
  if (config.get('autoOpen', false)) {
    vscode.commands.executeCommand('copilotGame.open');
  }
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js')
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
      <span id="state-icon">😴</span>
      <span id="level">Lv.1</span>
      <span id="file">📁 Ready</span>
      <span id="status">😴 Waiting for Copilot...</span>
      <span id="streak"></span>
      <div id="stats-tooltip"></div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

export function deactivate() {}
