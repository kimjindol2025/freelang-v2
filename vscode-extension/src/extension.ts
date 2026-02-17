/**
 * ════════════════════════════════════════════════════════════════════
 * FreeLang VS Code Extension
 *
 * LSP 클라이언트로 FreeLang 언어 지원 제공
 * ════════════════════════════════════════════════════════════════════
 */

import * as path from 'path';
import { ExtensionContext, window, commands } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  State
} from 'vscode-languageclient/node';

let client: LanguageClient | null = null;

/**
 * 확장 활성화
 */
export async function activate(context: ExtensionContext) {
  console.log('Activating FreeLang extension...');

  // LSP 서버 옵션
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', '@freelang', 'runtime', 'dist', 'lsp', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.stdio
    },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  };

  // LSP 클라이언트 옵션
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'freelang' }],
    synchronize: {
      fileEvents: {
        glob: '**/.clientvscode',
        ignoreChangeWatcher: true
      }
    },
    outputChannelName: 'FreeLang',
    traceOutputChannel: 'FreeLang Trace'
  };

  // LSP 클라이언트 생성
  client = new LanguageClient(
    'freelang',
    'FreeLang Language Server',
    serverOptions,
    clientOptions
  );

  // 상태 변경 핸들러
  client.onDidChangeState((event) => {
    if (event.newState === State.Running) {
      console.log('FreeLang LSP Server started');
      window.showInformationMessage('FreeLang Language Server is running');
    } else if (event.newState === State.Stopped) {
      console.log('FreeLang LSP Server stopped');
    }
  });

  // 에러 핸들러
  client.onNotification('window/showMessage', (params) => {
    window.showInformationMessage(params.message);
  });

  client.onNotification('window/logMessage', (params) => {
    console.log(params.message);
  });

  try {
    await client.start();
    console.log('FreeLang extension activated');
  } catch (error) {
    console.error('Failed to activate FreeLang extension:', error);
    window.showErrorMessage('FreeLang extension failed to activate');
  }

  // 커맨드 등록
  registerCommands(context);

  return {
    client,
    dispose: () => {
      if (client) {
        client.stop();
      }
    }
  };
}

/**
 * 확장 비활성화
 */
export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}

/**
 * 커맨드 등록
 */
function registerCommands(context: ExtensionContext): void {
  // Go to definition
  commands.registerCommand('freelang.goToDefinition', async () => {
    if (!client) return;

    const editor = window.activeTextEditor;
    if (!editor) return;

    try {
      const params = {
        textDocument: { uri: editor.document.uri.toString() },
        position: editor.selection.start
      };

      // client.sendRequest('textDocument/definition', params);
      window.showInformationMessage('Go to Definition - Server implementation needed');
    } catch (error) {
      window.showErrorMessage(`Error: ${error}`);
    }
  });

  // Restart server
  commands.registerCommand('freelang.restartServer', async () => {
    if (!client) return;

    try {
      if (client.state === State.Running) {
        await client.stop();
        window.showInformationMessage('FreeLang Language Server stopped');
      }

      await client.start();
      window.showInformationMessage('FreeLang Language Server restarted');
    } catch (error) {
      window.showErrorMessage(`Failed to restart: ${error}`);
    }
  });

  // Type info
  commands.registerCommand('freelang.showTypeInfo', async () => {
    window.showInformationMessage('Type Info - Server implementation needed');
  });

  // Format document
  commands.registerCommand('freelang.formatDocument', async () => {
    const editor = window.activeTextEditor;
    if (!editor) return;

    window.showInformationMessage('Format Document - Server implementation needed');
  });

  context.subscriptions.push(
    commands.registerCommand('freelang.goToDefinition', () =>
      commands.executeCommand('freelang.goToDefinition')
    ),
    commands.registerCommand('freelang.restartServer', () =>
      commands.executeCommand('freelang.restartServer')
    ),
    commands.registerCommand('freelang.showTypeInfo', () =>
      commands.executeCommand('freelang.showTypeInfo')
    ),
    commands.registerCommand('freelang.formatDocument', () =>
      commands.executeCommand('freelang.formatDocument')
    )
  );
}

/**
 * 설정 가져오기
 */
export function getConfiguration(): {
  typeCheckMode: string;
  maxProblems: number;
  traceServer: string;
} {
  const config = require('vscode').workspace.getConfiguration('freelang');

  return {
    typeCheckMode: config.get('typeCheckMode') || 'standard',
    maxProblems: config.get('maxProblems') || 100,
    traceServer: config.get('trace.server') || 'off'
  };
}
