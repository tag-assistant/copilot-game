import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ===== Copilot Activity Detection =====
// Layer 1: Copilot Log Tailing (PRIMARY) — reads real tool calls from Copilot logs
// Layer 2: Heuristic Detection (FALLBACK) — infers agent activity from VS Code events
// Layer 3: Standard VS Code Events (ALWAYS ON) — diagnostics, file creation, etc.

export type AgentState = 'IDLE' | 'COPILOT_ACTIVE' | 'COPILOT_IDLE' | 'USER_ACTIVE';
export type DetectionMode = 'log' | 'heuristic';

export interface CopilotGameEvent {
  type:
    | 'agentStateChange'
    | 'agentFileOpen'
    | 'agentFileEdit'
    | 'agentFileCreate'
    | 'agentFileDelete'
    | 'agentCodeDelete'
    | 'agentTerminal'
    | 'agentSearch'
    | 'agentErrorCheck'
    | 'agentPatch'
    | 'errorsAppear'
    | 'errorsCleared'
    | 'warningsAppear'
    | 'sessionSummary'
    | 'configUpdate'
    | 'detectionMode'
    | 'toolCall'
    | 'init';
  agentState?: AgentState;
  file?: string;
  linesChanged?: number;
  linesDeleted?: number;
  errorCount?: number;
  warningCount?: number;
  config?: { soundEnabled?: boolean; monaSize?: number; showXPBar?: boolean };
  summary?: SessionSummary;
  detectionMode?: DetectionMode;
  toolName?: string;
  toolArgs?: string;
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

// ===== Tool Name Mapping =====
type ToolCategory = 'read' | 'edit' | 'create' | 'delete' | 'terminal' | 'search' | 'errors' | 'patch';

const TOOL_MAP: Record<string, ToolCategory> = {
  readFile: 'read', read_file: 'read',
  editFile: 'edit', insert_edit_into_file: 'edit', replace_string_in_file: 'edit',
  runTerminalCommand: 'terminal', run_in_terminal: 'terminal',
  searchFiles: 'search', grep_search: 'search', file_search: 'search',
  listFiles: 'read', list_directory: 'read',
  createFile: 'create', create_new_file: 'create',
  deleteFile: 'delete',
  getErrors: 'errors', get_diagnostics: 'errors',
  applyPatch: 'patch',
};

// Regex patterns to detect tool calls in Copilot log lines
const TOOL_CALL_PATTERNS = [
  // "Tool call: toolName" or "Calling tool: toolName"
  /(?:Tool call|Calling tool|tool_call|ToolCall)[:\s]+['"]?(\w+)['"]?/i,
  // "tool_name": "readFile"  (JSON-like)
  /"tool_name"\s*:\s*"(\w+)"/,
  // name: "readFile" in tool_use blocks
  /name[:\s]+['"]?(\w+)['"]?\s/,
  // function_call patterns
  /function_call.*?name[:\s]+['"]?(\w+)['"]?/i,
  // [tool] readFile
  /\[tool\]\s+(\w+)/i,
];

// Patterns to extract file arguments from tool calls
const FILE_ARG_PATTERNS = [
  /"(?:file|path|filePath|fileName)"\s*:\s*"([^"]+)"/,
  /(?:file|path)=["']?([^\s"']+)/i,
];

const COMMAND_ARG_PATTERNS = [
  /"(?:command|cmd)"\s*:\s*"([^"]+)"/,
  /(?:command|cmd)=["']?([^\s"']+)/i,
];

const SEARCH_ARG_PATTERNS = [
  /"(?:query|pattern|search|text)"\s*:\s*"([^"]+)"/,
  /(?:query|pattern)=["']?([^\s"']+)/i,
];

function extractArg(line: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return m[1];
  }
  return undefined;
}

// ===== Log File Discovery =====
function findCopilotLogFiles(): string[] {
  const candidates: string[] = [];

  // 1. Check VS Code log directory (session-specific)
  // On macOS: ~/Library/Application Support/Code/logs/<session>/exthost*/
  // On Linux: ~/.config/Code/logs/<session>/exthost*/
  // On Windows: %APPDATA%/Code/logs/<session>/exthost*/
  const platform = os.platform();
  let logBase: string;
  if (platform === 'darwin') {
    logBase = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'logs');
  } else if (platform === 'win32') {
    logBase = path.join(process.env.APPDATA || '', 'Code', 'logs');
  } else {
    logBase = path.join(os.homedir(), '.config', 'Code', 'logs');
  }

  // Also check Code Insiders, Codium
  const logBases = [
    logBase,
    logBase.replace('/Code/', '/Code - Insiders/'),
    logBase.replace('/Code/', '/VSCodium/'),
  ];

  for (const base of logBases) {
    try {
      if (!fs.existsSync(base)) continue;
      // Get the most recent session directory
      const sessions = fs.readdirSync(base)
        .filter(d => {
          try { return fs.statSync(path.join(base, d)).isDirectory(); } catch { return false; }
        })
        .sort((a, b) => {
          try {
            return fs.statSync(path.join(base, b)).mtimeMs - fs.statSync(path.join(base, a)).mtimeMs;
          } catch { return 0; }
        });

      for (const session of sessions.slice(0, 3)) {
        const sessionDir = path.join(base, session);
        try {
          const entries = fs.readdirSync(sessionDir);
          for (const entry of entries) {
            if (entry.startsWith('exthost') || entry.includes('extension')) {
              const extDir = path.join(sessionDir, entry);
              try {
                const files = fs.readdirSync(extDir);
                for (const f of files) {
                  if (f.includes('GitHub.copilot') || f.includes('github.copilot')) {
                    candidates.push(path.join(extDir, f));
                  }
                }
                // Also check for output_logging_* files
                for (const f of files) {
                  if (f.endsWith('.log') && (f.includes('output') || f.includes('copilot'))) {
                    candidates.push(path.join(extDir, f));
                  }
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // 2. Check Copilot extension directory for log files
  const extBase = path.join(os.homedir(), '.vscode', 'extensions');
  const extBases = [
    extBase,
    extBase.replace('.vscode', '.vscode-insiders'),
  ];

  for (const base of extBases) {
    try {
      if (!fs.existsSync(base)) continue;
      const dirs = fs.readdirSync(base).filter(d => d.startsWith('github.copilot-chat-'));
      for (const d of dirs) {
        const extDir = path.join(base, d);
        // Check for log files in the extension directory
        try {
          const walk = (dir: string, depth = 0): void => {
            if (depth > 2) return;
            const entries = fs.readdirSync(dir);
            for (const e of entries) {
              const full = path.join(dir, e);
              try {
                const stat = fs.statSync(full);
                if (stat.isFile() && e.endsWith('.log')) {
                  candidates.push(full);
                } else if (stat.isDirectory() && depth < 2) {
                  walk(full, depth + 1);
                }
              } catch { /* skip */ }
            }
          };
          walk(extDir);
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // 3. Check globalStorage for Copilot
  // ~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/
  const gsBase = platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage')
    : platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage')
    : path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage');

  const gsDirs = ['github.copilot-chat', 'github.copilot'];
  for (const gsDir of gsDirs) {
    const gsPath = path.join(gsBase, gsDir);
    try {
      if (fs.existsSync(gsPath)) {
        const walk = (dir: string, depth = 0): void => {
          if (depth > 2) return;
          const entries = fs.readdirSync(dir);
          for (const e of entries) {
            const full = path.join(dir, e);
            try {
              const stat = fs.statSync(full);
              if (stat.isFile() && e.endsWith('.log')) {
                candidates.push(full);
              } else if (stat.isDirectory() && depth < 2) {
                walk(full, depth + 1);
              }
            } catch { /* skip */ }
          }
        };
        walk(gsPath);
      }
    } catch { /* skip */ }
  }

  // Sort by modification time (most recent first)
  return candidates
    .filter(f => {
      try { return fs.statSync(f).isFile(); } catch { return false; }
    })
    .sort((a, b) => {
      try {
        return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
      } catch { return 0; }
    });
}

// ===== Log Tailer =====
class CopilotLogTailer {
  private watchers: fs.FSWatcher[] = [];
  private filePositions = new Map<string, number>();
  private onToolCall: (tool: string, category: ToolCategory, file?: string, args?: string) => void;
  private disposed = false;
  private scanInterval: ReturnType<typeof setInterval> | undefined;
  private watchedFiles = new Set<string>();

  constructor(onToolCall: (tool: string, category: ToolCategory, file?: string, args?: string) => void) {
    this.onToolCall = onToolCall;
  }

  start(): boolean {
    const logFiles = findCopilotLogFiles();
    if (logFiles.length === 0) return false;

    // Watch the most recent log files (up to 5)
    for (const logFile of logFiles.slice(0, 5)) {
      this.tailFile(logFile);
    }

    // Periodically scan for new log files
    this.scanInterval = setInterval(() => {
      if (this.disposed) return;
      const newFiles = findCopilotLogFiles();
      for (const f of newFiles.slice(0, 5)) {
        if (!this.watchedFiles.has(f)) {
          this.tailFile(f);
        }
      }
    }, 30000); // every 30s

    return this.watchedFiles.size > 0;
  }

  private tailFile(filePath: string) {
    if (this.watchedFiles.has(filePath)) return;
    this.watchedFiles.add(filePath);

    try {
      // Start from current end of file (only read new content)
      const stat = fs.statSync(filePath);
      this.filePositions.set(filePath, stat.size);

      const watcher = fs.watchFile(filePath, { interval: 500 }, () => {
        if (this.disposed) return;
        this.readNewLines(filePath);
      });

      // fs.watchFile doesn't return a FSWatcher we can close the same way
      // but we track the path to unwatchFile later
    } catch {
      this.watchedFiles.delete(filePath);
    }
  }

  private readNewLines(filePath: string) {
    try {
      const stat = fs.statSync(filePath);
      const lastPos = this.filePositions.get(filePath) || 0;

      if (stat.size <= lastPos) {
        // File was truncated or unchanged
        if (stat.size < lastPos) {
          this.filePositions.set(filePath, 0);
        }
        return;
      }

      // Read only new bytes
      const fd = fs.openSync(filePath, 'r');
      const bufSize = Math.min(stat.size - lastPos, 64 * 1024); // max 64KB at a time
      const buf = Buffer.alloc(bufSize);
      fs.readSync(fd, buf, 0, bufSize, lastPos);
      fs.closeSync(fd);

      this.filePositions.set(filePath, lastPos + bufSize);

      const newText = buf.toString('utf8');
      const lines = newText.split('\n');

      for (const line of lines) {
        this.parseLine(line);
      }
    } catch {
      // File may have been deleted
    }
  }

  private parseLine(line: string) {
    if (!line || line.length < 5) return;

    for (const pattern of TOOL_CALL_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const toolName = match[1];
        const category = TOOL_MAP[toolName];
        if (category) {
          const file = extractArg(line, FILE_ARG_PATTERNS);
          let args: string | undefined;
          if (category === 'terminal') args = extractArg(line, COMMAND_ARG_PATTERNS);
          if (category === 'search') args = extractArg(line, SEARCH_ARG_PATTERNS);
          this.onToolCall(toolName, category, file, args);
          return;
        }
      }
    }
  }

  dispose() {
    this.disposed = true;
    if (this.scanInterval) clearInterval(this.scanInterval);
    for (const f of this.watchedFiles) {
      try { fs.unwatchFile(f); } catch { /* ok */ }
    }
    this.watchedFiles.clear();
    this.filePositions.clear();
  }
}

// ===== Main Event Listener Setup =====
export function createEventListeners(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // ----- Detection mode -----
  let detectionMode: DetectionMode = 'heuristic';

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
      agentIdleTimeout = setTimeout(() => setAgentState('COPILOT_IDLE'), 8000);
    } else if (agentState === 'COPILOT_IDLE') {
      fullIdleTimeout = setTimeout(() => setAgentState('IDLE'), 20000);
    }
  }

  function signalAgent() {
    lastAgentSignal = Date.now();
    if (agentState === 'IDLE' || agentState === 'COPILOT_IDLE') {
      setAgentState('COPILOT_ACTIVE');
    } else if (agentState === 'COPILOT_ACTIVE') {
      resetTimers();
    }
  }

  function isUserActive(): boolean {
    return Date.now() - lastUserCursorMove < 500;
  }

  // ===== LAYER 1: Copilot Log Tailing (PRIMARY) =====
  const logTailer = new CopilotLogTailer((toolName, category, file, args) => {
    signalAgent();

    // Send raw tool call event for activity log
    post({ type: 'toolCall', toolName, toolArgs: file || args });

    const relPath = file ? vscode.workspace.asRelativePath(file) : undefined;
    if (relPath) sessionFiles.add(relPath);

    switch (category) {
      case 'read':
        if (relPath) {
          post({ type: 'agentFileOpen', file: relPath });
        }
        break;
      case 'edit':
        sessionLinesWritten += 1;
        post({ type: 'agentFileEdit', file: relPath || 'unknown', linesChanged: 1 });
        break;
      case 'create':
        post({ type: 'agentFileCreate', file: relPath || 'unknown' });
        break;
      case 'delete':
        post({ type: 'agentFileDelete', file: relPath || 'unknown' });
        break;
      case 'terminal':
        sessionTerminalCmds++;
        post({ type: 'agentTerminal', toolArgs: args });
        break;
      case 'search':
        post({ type: 'agentSearch', toolArgs: args, file: relPath });
        break;
      case 'errors':
        post({ type: 'agentErrorCheck' });
        break;
      case 'patch':
        post({ type: 'agentPatch', file: relPath });
        break;
    }
  });

  const logStarted = logTailer.start();
  detectionMode = logStarted ? 'log' : 'heuristic';
  disposables.push({ dispose: () => logTailer.dispose() });

  // ===== LAYER 2: Heuristic Detection (FALLBACK) =====
  // Only used for agent state detection when log tailing is unavailable
  // Always used for line count accuracy (log tailing doesn't know exact line counts)

  // ----- Track user cursor activity -----
  disposables.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      lastUserCursorMove = Date.now();
      lastUserFocusedDoc = e.textEditor.document.uri.toString();
    })
  );

  // ----- Track active editor changes -----
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        lastActiveEditorUri = editor.document.uri.toString();
      }
    })
  );

  // ----- Document changes — heuristic core -----
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0) return;
      if (e.document.uri.scheme !== 'file') return;

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
      recentEditFiles = recentEditFiles.filter((f) => now - f.time < 2000);
      const uniqueRecentFiles = new Set(recentEditFiles.map((f) => f.uri)).size;
      const isMultiFileRapid = uniqueRecentFiles >= 2;

      let agentScore = 0;
      if (isBackgroundEdit) agentScore += 3;
      if (isLargeBlock) agentScore += 2;
      if (isCursorInactive) agentScore += 1;
      if (isMultiFileRapid) agentScore += 2;

      if (agentScore >= 2 && isNotUserTyping) {
        // In log mode, we already get signals from the log tailer
        // but we still use heuristics to update line counts accurately
        if (detectionMode === 'heuristic') {
          signalAgent();
        }

        sessionFiles.add(relPath);

        if (totalDeleted > totalInserted && totalDeleted > 10) {
          sessionLinesDeleted += Math.max(1, linesRemoved);
          if (detectionMode === 'heuristic') {
            post({ type: 'agentCodeDelete', file: relPath, linesDeleted: Math.max(1, linesRemoved) });
          }
        } else {
          // Update line counts even in log mode (more accurate than log parsing)
          const lines = Math.max(1, linesInserted);
          sessionLinesWritten += lines;
          if (detectionMode === 'heuristic') {
            post({ type: 'agentFileEdit', file: relPath, linesChanged: lines });
          } else {
            // In log mode, send updated line counts for accuracy
            post({ type: 'agentFileEdit', file: relPath, linesChanged: lines });
          }
        }
      }
    })
  );

  // ----- Files opening without user click -----
  disposables.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.uri.scheme !== 'file') return;
      const docUri = doc.uri.toString();
      setTimeout(() => {
        if (docUri !== lastActiveEditorUri) {
          const relPath = vscode.workspace.asRelativePath(doc.uri);
          if (detectionMode === 'heuristic') {
            signalAgent();
            sessionFiles.add(relPath);
            post({ type: 'agentFileOpen', file: relPath });
          }
        }
      }, 100);
    })
  );

  // ----- New file creation (ALWAYS ON — works in both modes) -----
  disposables.push(
    vscode.workspace.onDidCreateFiles((e) => {
      for (const file of e.files) {
        const relPath = vscode.workspace.asRelativePath(file);
        if (detectionMode === 'heuristic') {
          signalAgent();
          sessionFiles.add(relPath);
          post({ type: 'agentFileCreate', file: relPath });
        }
      }
    })
  );

  // ----- Terminal activity -----
  disposables.push(
    vscode.window.onDidOpenTerminal(() => {
      const activeTerminal = vscode.window.activeTerminal;
      if (!activeTerminal && detectionMode === 'heuristic') {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: 'agentTerminal' });
      }
    })
  );
  disposables.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      if (!isUserActive() && detectionMode === 'heuristic') {
        signalAgent();
        sessionTerminalCmds++;
        post({ type: 'agentTerminal' });
      }
    })
  );

  // ===== LAYER 3: Standard VS Code Events (ALWAYS ON) =====

  // ----- Diagnostics -----
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
  post({ type: 'detectionMode', detectionMode });

  return disposables;
}
