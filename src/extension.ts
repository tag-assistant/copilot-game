import * as vscode from 'vscode';
import { createEventListeners } from './events';

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand('copilotGame.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'copilotGame',
      '🐱 Mona\'s Adventure',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = getWebviewContent(panel.webview, context);

    const listeners = createEventListeners(panel);
    panel.onDidDispose(() => listeners.forEach(d => d.dispose()));
    context.subscriptions.push(...listeners);

    // Send init after webview is ready
    setTimeout(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        panel.webview.postMessage({
          type: 'fileOpen',
          file: vscode.workspace.asRelativePath(editor.document.uri),
        });
      }
    }, 500);
  });

  context.subscriptions.push(cmd);
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const nonce = getNonce();

  // Read the bundled webview JS
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
      <span id="file">📁 Ready</span>
      <span id="status">🐱 Mona is ready!</span>
      <span id="streak"></span>
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
