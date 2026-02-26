import * as vscode from 'vscode';

// ===== Copilot Activity Detection State Machine =====
// Distinguishes agent (Copilot/Claude/etc.) activity from human typing
// using pure VS Code extension API heuristics.

export type AgentState = 'IDLE' | 'COPILOT_ACTIVE' | 'COPILOT_IDLE' | 'USER_ACTIVE';

export interface CopilotGameEvent {
  type:
    | 'agentStateChange'
    | 'agentFileOpen'
    | 'agentFileEdit'
    | 'agentFileCreate'
    | 'agentCodeDelete'
    | 'agentTerminal'
    | 'errorsAppear'
    | 'errorsCleared'
    | 'warningsAppear'
    | 'sessionSummary'
    | 'configUpdate'
    | 'init';
  agentState?: AgentState;
  file?: string;
  linesChanged?: number;
  linesDeleted?: number;
  errorCount?: number;
  warningCount?: number;
  config?: { soundEnabled?: boolean; monaSize?: number; showXPBar?: boolean };
  summary?: SessionSummary;
}

export interface SessionSummary {
  filesVisited: string[];
  linesWritten: number;
  linesDeleted: number;
  terminalCommands: number;
  errorsEncountered: number;
  errorsFixed: number;
  durationMs: number;
}

export function createEventListeners(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // ----- User activity tracking -----
  let lastUserCursorMove = 0;
  let lastUserFocusedDoc: string | undefined;
  let lastActiveEditorUri: string | undefined;

  // ----- Agent detection state -----
  let agentState: AgentState = 'IDLE';
  let lastAgentSignal = 0;
  let agentIdleTimeout: ReturnType<typeof setTimeout> | undefined;
  let fullIdleTimeout: ReturnType<typeof setTimeout> | undefined;

  // ----- Session tracking -----
  let sessionStart = 0;
  const sessionFiles = new Set<string>();
  let sessionLinesWritten = 0;
  let sessionLinesDeleted = 0;
  let sessionTerminalCmds = 0;
  let sessionErrorsEncountered = 0;
  let sessionErrorsFixed = 0;

  // ----- Multi-file edit detection -----
  let recentEditFiles: { uri: string; time: number }[] = [];

  // ----- Diagnostics tracking -----
  let lastErrorCount = 0;
  let lastWarningCount = 0;

  function post(event: CopilotGameEvent) {
    panel.webview.postMessage(event);
  }

  function setAgentState(newState: AgentState) {
    if (newState === agentState) return;
    const prev = agentState;
    agentState = newState;

    if (newState === 'COPILOT_ACTIVE' && prev === 'IDLE') {
      sessionStart = Date.now();
      sessionFiles.clear();
      sessionLinesWritten = 0;
      sessionLinesDeleted = 0;
      sessionTerminalCmds = 0;
      sessionErrorsEncountered = 0;
      sessionErrorsFixed = 0;
    }

    if (newState === 'IDLE' && (prev === 'COPILOT_IDLE' || prev === 'COPILOT_ACTIVE')) {
      // Session ended — send summary
      if (sessionFiles.size > 0) {
        post({
          type: 'sessionSummary',
          summary: {
            filesVisited: [...sessionFiles],
            linesWritten: sessionLinesWritten,
            linesDeleted: sessionLinesDeleted,
            terminalCommands: sessionTerminalCmds,
            errorsEncountered: sessionErrorsEncountered,
            errorsFixed: sessionErrorsFixed,
            durationMs: Date.now() - sessionStart,
          },
        });
      }
    }

    post({ type: 'agentStateChange', agentState: newState });
    resetTimers();
  }

  function resetTimers() {
    if (agentIdleTimeout) clearTimeout(agentIdleTimeout);
    if (fullIdleTimeout) clearTimeout(fullIdleTimeout);

    if (agentState === 'COPILOT_ACTIVE') {
      agentIdleTimeout = setTimeout(() => setAgentState('COPILOT_IDLE'), 5000);
    } else if (agentState === 'COPILOT_IDLE') {
      fullIdleTimeout = setTimeout(() => setAgentState('IDLE'), 15000);
    }
  }

  function signalAgent() {
    lastAgentSignal = Date.now();
    if (agentState === 'IDLE' || agentState === 'COPILOT_IDLE') {
      setAgentState('COPILOT_ACTIVE');
    } else if (agentState === 'COPILOT_ACTIVE') {
      resetTimers(); // extend the timeout
    }
  }

  function isUserActive(): boolean {
    return Date.now() - lastUserCursorMove < 500;
  }

  // ----- 1. Track user cursor activity -----
  disposables.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      lastUserCursorMove = Date.now();
      lastUserFocusedDoc = e.textEditor.document.uri.toString();
    })
  );

  // ----- 2. Track active editor changes (user clicking files) -----
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        lastActiveEditorUri = editor.document.uri.toString();
      }
    })
  );

  // ----- 3. Document changes — the core heuristic -----
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) return;
      if (e.document.uri.scheme !== 'file') return;

      const docUri = e.document.uri.toString();
      const relPath = vscode.workspace.asRelativePath(e.document.uri);
      const now = Date.now();

      // Calculate total chars inserted and deleted
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

      // Heuristic signals for agent activity:
      const isBackgroundEdit = docUri !== lastActiveEditorUri;
      const isLargeBlock = totalInserted > 20;
      const isCursorInactive = now - lastUserCursorMove > 300;
      const isNotUserTyping = !isUserActive() || isBackgroundEdit;

      // Multi-file edit detection
      recentEditFiles.push({ uri: docUri, time: now });
      recentEditFiles = recentEditFiles.filter((f) => now - f.time < 2000);
      const uniqueRecentFiles = new Set(recentEditFiles.map((f) => f.uri)).size;
      const isMultiFileRapid = uniqueRecentFiles >= 2;

      // Score the likelihood this is an agent edit
      let agentScore = 0;
      if (isBackgroundEdit) agentScore += 3;
      if (isLargeBlock) agentScore += 2;
      if (isCursorInactive) agentScore += 1;
      if (isMultiFileRapid) agentScore += 2;

      if (agentScore >= 2 && isNotUserTyping) {
        signalAgent();
        sessionFiles.add(relPath);

        if (totalDeleted > totalInserted && totalDeleted > 10) {
          // Mostly deletion
          sessionLinesDeleted += Math.max(1, linesRemoved);
          post({ type: 'agentCodeDelete', file: relPath, linesDeleted: Math.max(1, linesRemoved) });
        } else {
          sessionLinesWritten += Math.max(1, linesInserted);
          post({ type: 'agentFileEdit', file: relPath, linesChanged: Math.max(1, linesInserted) });
        }
      }
      // If agentScore < 2, it's likely user typing — ignore
    })
  );

  // ----- 4. Files opening without user click (background opens) -----
  disposables.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.uri.scheme !== 'file') return;
      const docUri = doc.uri.toString();
      // If this file opened but isn't the active editor, it's a background open
      setTimeout(() => {
        if (docUri !== lastActiveEditorUri) {
          const relPath = vscode.workspace.asRelativePath(doc.uri);
          signalAgent();
          sessionFiles.add(relPath);
          post({ type: 'agentFileOpen', file: relPath });
        }
      }, 100);
    })
  );

  // ----- 5. New file creation -----
  disposables.push(
    vscode.workspace.onDidCreateFiles((e) => {
      for (const file of e.files) {
        const relPath = vscode.workspace.asRelativePath(file);
        signalAgent();
        sessionFiles.add(relPath);
        post({ type: 'agentFileCreate', file: relPath });
      }
    })
  );

  // ----- 6. Terminal activity -----
  disposables.push(
    vscode.window.onDidOpenTerminal(() => {
      // If user isn't focused on terminal, likely agent
      const activeTerminal = vscode.window.activeTerminal;
      if (!activeTerminal) {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: 'agentTerminal' });
      }
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      // Terminal switching can indicate agent running commands
      if (!isUserActive()) {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: 'agentTerminal' });
      }
    })
  );

  // ----- 7. Diagnostics (errors/warnings) -----
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
        const newErrors = errorCount - lastErrorCount;
        sessionErrorsEncountered += newErrors;
        post({ type: 'errorsAppear', errorCount: newErrors });
      } else if (errorCount < lastErrorCount && errorCount === 0) {
        sessionErrorsFixed += lastErrorCount;
        post({ type: 'errorsCleared' });
      }
      if (warningCount > lastWarningCount) {
        post({ type: 'warningsAppear', warningCount: warningCount - lastWarningCount });
      }
      lastErrorCount = errorCount;
      lastWarningCount = warningCount;
    })
  );

  // ----- Stats persistence -----
  panel.webview.onDidReceiveMessage(
    (msg) => {
      if (msg.type === 'saveStats') {
        context.globalState.update('copilotGame.stats', msg.stats);
      }
    },
    undefined,
    disposables
  );

  const savedStats = context.globalState.get('copilotGame.stats');
  if (savedStats) {
    setTimeout(() => panel.webview.postMessage({ type: 'loadStats', stats: savedStats }), 600);
  }

  // ----- Config -----
  setTimeout(() => {
    const config = vscode.workspace.getConfiguration('copilotGame');
    post({
      type: 'configUpdate',
      config: {
        soundEnabled: config.get('soundEnabled', false),
        monaSize: config.get('monaSize', 64),
        showXPBar: config.get('showXPBar', true),
      },
    });
  }, 300);

  disposables.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('copilotGame')) {
        const config = vscode.workspace.getConfiguration('copilotGame');
        post({
          type: 'configUpdate',
          config: {
            soundEnabled: config.get('soundEnabled', false),
            monaSize: config.get('monaSize', 64),
            showXPBar: config.get('showXPBar', true),
          },
        });
      }
    })
  );

  // Initialize
  post({ type: 'agentStateChange', agentState: 'IDLE' });

  return disposables;
}
