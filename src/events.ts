import * as vscode from 'vscode';

// Game event types sent to webview
interface GameEvent {
  type: 'fileOpen' | 'fileChange' | 'fileSave' | 'terminal' | 'errorsAppear' | 'errorsCleared' | 'idle' | 'init';
  file?: string;
  errorCount?: number;
}

export function createEventListeners(panel: vscode.WebviewPanel): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  let idleTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastErrorCount = 0;

  function post(event: GameEvent) {
    panel.webview.postMessage(event);
    // Reset idle timer
    if (idleTimeout) clearTimeout(idleTimeout);
    if (event.type !== 'idle') {
      idleTimeout = setTimeout(() => post({ type: 'idle' }), 5000);
    }
  }

  // File opened/switched
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        post({ type: 'fileOpen', file: vscode.workspace.asRelativePath(editor.document.uri) });
      }
    })
  );

  // Text changed (coding)
  let changeDebounce: ReturnType<typeof setTimeout> | undefined;
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) return;
      if (changeDebounce) clearTimeout(changeDebounce);
      changeDebounce = setTimeout(() => {
        post({ type: 'fileChange', file: vscode.workspace.asRelativePath(e.document.uri) });
      }, 100);
    })
  );

  // File saved
  disposables.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      post({ type: 'fileSave', file: vscode.workspace.asRelativePath(doc.uri) });
    })
  );

  // Terminal activity
  disposables.push(
    vscode.window.onDidOpenTerminal(() => {
      post({ type: 'terminal' });
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      post({ type: 'terminal' });
    })
  );

  // Diagnostics (errors)
  disposables.push(
    vscode.languages.onDidChangeDiagnostics(() => {
      const allDiags = vscode.languages.getDiagnostics();
      let errorCount = 0;
      for (const [, diags] of allDiags) {
        errorCount += diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      }
      if (errorCount > lastErrorCount) {
        post({ type: 'errorsAppear', errorCount: errorCount - lastErrorCount });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        post({ type: 'errorsCleared' });
      }
      lastErrorCount = errorCount;
    })
  );

  // Start idle timer
  idleTimeout = setTimeout(() => post({ type: 'idle' }), 5000);

  return disposables;
}
