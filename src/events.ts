import * as vscode from 'vscode';

interface GameEvent {
  type: string;
  file?: string;
  errorCount?: number;
  warningCount?: number;
}

export function createEventListeners(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  let idleTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastErrorCount = 0;
  let lastWarningCount = 0;

  function post(event: GameEvent) {
    panel.webview.postMessage(event);
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
    vscode.window.onDidOpenTerminal(() => post({ type: 'terminal' }))
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => post({ type: 'terminal' }))
  );

  // Diagnostics (errors + warnings)
  disposables.push(
    vscode.languages.onDidChangeDiagnostics(() => {
      const allDiags = vscode.languages.getDiagnostics();
      let errorCount = 0;
      let warningCount = 0;
      for (const [, diags] of allDiags) {
        for (const d of diags) {
          if (d.severity === vscode.DiagnosticSeverity.Error) errorCount++;
          else if (d.severity === vscode.DiagnosticSeverity.Warning) warningCount++;
        }
      }
      if (errorCount > lastErrorCount) {
        post({ type: 'errorsAppear', errorCount: errorCount - lastErrorCount });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        post({ type: 'errorsCleared' });
      }
      if (warningCount > lastWarningCount) {
        post({ type: 'warningsAppear', warningCount: warningCount - lastWarningCount });
      }
      lastErrorCount = errorCount;
      lastWarningCount = warningCount;
    })
  );

  // Copilot detection: listen for inline suggest accept
  try {
    disposables.push(
      vscode.commands.registerCommand('copilotGame.internalCopilotDetect', () => {
        post({ type: 'copilotAssist' });
      })
    );
    // Try to detect Copilot suggestion commits via text document changes that look like completions
    // The most reliable way: listen for the command
  } catch {
    // Command may already be registered
  }

  // Listen for webview messages (stats persistence)
  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.type === 'saveStats') {
      context.globalState.update('copilotGame.stats', msg.stats);
    }
  }, undefined, disposables);

  // Load persisted stats
  const savedStats = context.globalState.get('copilotGame.stats');
  if (savedStats) {
    setTimeout(() => {
      panel.webview.postMessage({ type: 'loadStats', stats: savedStats });
    }, 600);
  }

  // Send config
  setTimeout(() => {
    const config = vscode.workspace.getConfiguration('copilotGame');
    panel.webview.postMessage({
      type: 'configUpdate',
      config: {
        soundEnabled: config.get('soundEnabled', false),
        monaSize: config.get('monaSize', 64),
        showXPBar: config.get('showXPBar', true),
      }
    });
  }, 300);

  // Watch for config changes
  disposables.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('copilotGame')) {
        const config = vscode.workspace.getConfiguration('copilotGame');
        panel.webview.postMessage({
          type: 'configUpdate',
          config: {
            soundEnabled: config.get('soundEnabled', false),
            monaSize: config.get('monaSize', 64),
            showXPBar: config.get('showXPBar', true),
          }
        });
      }
    })
  );

  // Start idle timer
  idleTimeout = setTimeout(() => post({ type: 'idle' }), 5000);

  return disposables;
}
