/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import {
  ChevronLeftIcon,
  useExplorerContext,
  useSchemaContext,
} from '@graphiql/react';
import { isType } from 'graphql';
import React, { ReactNode } from 'react';

import FieldDoc from './DocExplorer/FieldDoc';
import SchemaDoc from './DocExplorer/SchemaDoc';
// import SearchBox from './DocExplorer/SearchBox';
import SearchResults from './DocExplorer/SearchResults';
import TypeDoc from './DocExplorer/TypeDoc';

/**
 * DocExplorer
 *
 * Shows documentations for GraphQL definitions from the schema.
 *
 */
export function DocExplorer() {
  const {
    fetchError,
    isFetching,
    schema,
    validationErrors,
  } = useSchemaContext({ nonNull: true });
  const { explorerNavStack, pop } = useExplorerContext({
    nonNull: true,
  });

  const navItem = explorerNavStack[explorerNavStack.length - 1];

  let content: ReactNode = null;
  if (fetchError) {
    content = <div className="graphiql-error">Error fetching schema</div>;
  } else if (validationErrors) {
    content = (
      <div className="graphiql-error">
        Schema is invalid: {validationErrors[0].message}
      </div>
    );
  } else if (isFetching) {
    // Schema is undefined when it is being loaded via introspection.
    content = <div className="graphiql-spinner" />;
  } else if (!schema) {
    // Schema is null when it explicitly does not exist, typically due to
    // an error during introspection.
    content = <div>No GraphQL schema available</div>;
  } else if (navItem.search) {
    content = <SearchResults />;
  } else if (explorerNavStack.length === 1) {
    content = <SchemaDoc />;
  } else if (isType(navItem.def)) {
    content = <TypeDoc />;
  } else if (navItem.def) {
    content = <FieldDoc />;
  }

  // const shouldSearchBoxAppear =
  //   explorerNavStack.length === 1 ||
  //   (isType(navItem.def) && 'getFields' in navItem.def);

  let prevName;
  if (explorerNavStack.length > 1) {
    prevName = explorerNavStack[explorerNavStack.length - 2].name;
  }

  return (
    <section
      className="graphiql-doc-explorer"
      aria-label="Documentation Explorer">
      <div className="graphiql-doc-explorer-header">
        <div className="graphiql-doc-explorer-header-content">
          {prevName && (
            <a
              href="#"
              className="graphiql-doc-explorer-back"
              onClick={pop}
              aria-label={`Go back to ${prevName}`}>
              <ChevronLeftIcon />
              {prevName}
            </a>
          )}
          <div className="graphiql-doc-explorer-title">
            {navItem.title || navItem.name}
          </div>
        </div>
      </div>
      <div className="graphiql-doc-explorer-content">
        {/* {shouldSearchBoxAppear && (
          <SearchBox
            value={navItem.search}
            placeholder={`Search ${navItem.name}...`}
            onSearch={showSearch}
          />
        )} */}
        {content}
      </div>
    </section>
  );
}
