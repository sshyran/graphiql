import { visit, OperationTypeNode, GraphQLError } from 'graphql';
import gql from 'graphql-tag';
import { fetch } from '@whatwg-node/fetch';
import { Agent } from 'https';
import * as ws from 'ws';
import { pipe, subscribe } from 'wonka';

import type { Endpoint } from "graphql-config/typings/extensions/endpoints"

import { OutputChannel, workspace } from 'vscode';
import { GraphQLProjectConfig } from 'graphql-config';
import { createClient as createWSClient, OperationResult } from 'graphql-ws';
import {
  CombinedError,
  createClient,
  defaultExchanges,
  subscriptionExchange
} from '@urql/core';


import {
  ExtractedTemplateLiteral,
  SourceHelper,
  getFragmentDependenciesForAST,
} from './source';


export class NetworkHelper {
  private outputChannel: OutputChannel;
  private sourceHelper: SourceHelper;

  constructor(outputChannel: OutputChannel, sourceHelper: SourceHelper) {
    this.outputChannel = outputChannel;
    this.sourceHelper = sourceHelper;
  }
  private buildClient({
    operation,
    endpoint,
  }: // updateCallback,
  {
    operation: string;
    endpoint: Endpoint;
    updateCallback: (data: string, operation: string) => void;
  }) {
    const { rejectUnauthorized } = workspace.getConfiguration('vscode-graphql');
    // this is a node specific setting that can allow requests against servers using self-signed certificates
    // it is similar to passing the nodejs env variable flag, except configured on a per-request basis here
    const agent = new Agent({ rejectUnauthorized });

    const exchanges = [...defaultExchanges];
    if (operation === 'subscription') {
      const wsEndpointURL = endpoint.url.replace(/^http/, 'ws');
      const wsClient = createWSClient({
        url: wsEndpointURL,
        connectionAckWaitTimeout: 3000,
        webSocketImpl: ws,
      });
      exchanges.push(
        subscriptionExchange({
          forwardSubscription: op => ({
            subscribe: sink => ({
              unsubscribe: wsClient.subscribe(op, sink),
            }),
          }),
        }),
      );
    }

    return createClient({
      url: endpoint.url,
      fetch,
      fetchOptions: {
        headers: endpoint.headers as HeadersInit,
        // this is an option that's only available in `node-fetch`, not in the standard fetch API
        // @ts-expect-error
        agent: new URL(endpoint.url).protocol === 'https:' ? agent : undefined,
      },
      exchanges,
    });
  }

  buildSubscribeConsumer =
    (cb: ExecuteOperationOptions['updateCallback'], operation: string) =>
    (result: OperationResult) => {
      const { errors, data, error } = result as {
        error?: CombinedError;
        errors?: GraphQLError[];
        data?: unknown;
      };
      if (errors || data) {
        cb(formatData(result), operation);
      }
      if (error) {
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          cb(
            JSON.stringify({ errors: error.graphQLErrors }, null, 2),
            operation,
          );
        }
        if (error.networkError) {
          cb(error.networkError.toString(), operation);
        }
      }
    };

  async executeOperation({
    endpoint,
    literal,
    variables,
    updateCallback,
    projectConfig,
  }: ExecuteOperationOptions) {
    const operationTypes: OperationTypeNode[] = [];
    const operationNames: string[] = [];

    visit(literal.ast, {
      OperationDefinition(node) {
        operationTypes.push(node.operation);
        operationNames.push(node.name?.value || '');
      },
    });
    const fragmentDefinitions = await this.sourceHelper.getFragmentDefinitions(
      projectConfig,
    );

    const fragmentInfos = await getFragmentDependenciesForAST(
      literal.ast,
      fragmentDefinitions,
    );

    fragmentInfos.forEach(fragmentInfo => {
      literal.content = fragmentInfo.content + '\n' + literal.content;
    });

    const parsedOperation = gql`
      ${literal.content}
    `;
    return Promise.all(
      operationTypes.map(async operation => {
        const subscriber = this.buildSubscribeConsumer(
          updateCallback,
          operation,
        );
        this.outputChannel.appendLine(`NetworkHelper: operation: ${operation}`);
        this.outputChannel.appendLine(
          `NetworkHelper: endpoint: ${endpoint.url}`,
        );
        const urqlClient = this.buildClient({
          operation,
          endpoint,
          updateCallback,
        });
        if (operation === 'subscription') {
          pipe(
            urqlClient.subscription(parsedOperation, variables),
            subscribe(subscriber),
          );
        } else {
          if (operation === 'query') {
            // TODO: fix this typescript error, upgrade urql
            pipe(
              // @ts-expect-error
              urqlClient.query(parsedOperation, variables),
              subscribe(subscriber),
            );
          } else {
            pipe(
              // @ts-expect-error
              urqlClient.mutation(parsedOperation, variables),
              subscribe(subscriber),
            );
          }
        }
      }),
    );
  }
}

export interface ExecuteOperationOptions {
  endpoint: Endpoint;
  literal: ExtractedTemplateLiteral;
  variables: object;
  updateCallback: (data: string, operation: string) => void;
  projectConfig: GraphQLProjectConfig;
}

function formatData({ data, errors }: any) {
  return JSON.stringify({ data, errors }, null, 2);
}
