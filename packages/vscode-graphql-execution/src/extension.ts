'use strict';

import {
  workspace,
  ExtensionContext,
  window,
  commands,
  OutputChannel,
  languages,
  Uri,
  ViewColumn,
} from 'vscode';

import { GraphQLContentProvider } from './providers/exec-content';
import { GraphQLCodeLensProvider } from './providers/exec-codelens';
import { ExtractedTemplateLiteral } from './helpers/source';

export function activate(context: ExtensionContext) {
  const outputChannel: OutputChannel = window.createOutputChannel(
    'GraphQL Operation Execution',
  );
  const config = getConfig();
  const { debug } = config;

  if (debug) {
    console.log('Extension "vscode-graphql-execution" is now active!');
  }

  const commandShowOutputChannel = commands.registerCommand(
    'vscode-graphql-execution.showOutputChannel',
    () => {
      outputChannel.show();
    },
  );
  context.subscriptions.push(commandShowOutputChannel);

  const registerCodeLens = () => {
    context.subscriptions.push(
      languages.registerCodeLensProvider(
        [
          'javascript',
          'typescript',
          'javascriptreact',
          'typescriptreact',
          'graphql',
        ],
        new GraphQLCodeLensProvider(outputChannel),
      ),
    );
  };

  if (getCodelensStatus()) {
    registerCodeLens();
  }

  workspace.onDidChangeConfiguration(() => {
    if (getCodelensStatus()) {
      registerCodeLens();
    }
  });

  const commandContentProvider = commands.registerCommand(
    'vscode-graphql-execution.contentProvider',
    async (literal: ExtractedTemplateLiteral) => {
      const uri = Uri.parse('graphql://authority/graphql');

      const panel = window.createWebviewPanel(
        'vscode-graphql-execution.results-preview',
        'GraphQL Execution Result',
        ViewColumn.Two,
        {},
      );

      const contentProvider = new GraphQLContentProvider(
        uri,
        outputChannel,
        literal,
        panel,
      );
      const registration = workspace.registerTextDocumentContentProvider(
        'graphql',
        contentProvider,
      );
      context.subscriptions.push(registration);

      const html = await contentProvider.getCurrentHtml();
      panel.webview.html = html;
    },
  );
  context.subscriptions.push(commandContentProvider);
}

export function deactivate() {
  console.log('Extension "vscode-graphql-execution" is now de-active!');
}

function getConfig() {
  return workspace.getConfiguration(
    'vscode-graphql.execution',
    window.activeTextEditor ? window.activeTextEditor.document.uri : null,
  );
}

/**
 * Use legacy config value for codelens status
 * @returns
 */
function getCodelensStatus() {
  const activeEditor = window.activeTextEditor
    ? window.activeTextEditor.document.uri
    : null;
  if (
    workspace
      .getConfiguration('vscode-graphql', activeEditor)
      .has('showExecCodelens')
  ) {
    return workspace.getConfiguration(
      'vscode-graphql.showExecCodelens',
      activeEditor,
    );
  }
  return getConfig().get('showCodelens');
}
