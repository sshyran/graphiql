import { QueryStoreItem } from '@graphiql/toolkit';
import { useEffect, useRef, useState } from 'react';

import { PenIcon, StarFilledIcon, StarIcon } from '../icons';
import { UnstyledButton } from '../ui';
import { useHistoryContext } from './context';
import { useSelectHistoryItem } from './hooks';

import './style.css';

export function History() {
  const { items } = useHistoryContext({ nonNull: true });

  return (
    <section aria-label="History" className="graphiql-history">
      <div className="graphiql-history-header">History</div>
      <ul className="graphiql-history-items">
        {items
          .slice()
          .reverse()
          .map((item, i) => {
            return (
              <HistoryItem
                key={`${i}:${item.label || item.query}`}
                item={item}
              />
            );
          })}
      </ul>
    </section>
  );
}

type QueryHistoryItemProps = {
  item: QueryStoreItem;
};

export function HistoryItem(props: QueryHistoryItemProps) {
  const { editLabel, toggleFavorite } = useHistoryContext({ nonNull: true });
  const selectHistoryItem = useSelectHistoryItem();
  const editField = useRef<HTMLInputElement>(null);
  const [isEditable, setIsEditable] = useState(false);

  useEffect(() => {
    if (isEditable && editField.current) {
      editField.current.focus();
    }
  }, [isEditable]);

  const displayName =
    props.item.label ||
    props.item.operationName ||
    formatQuery(props.item.query);

  // TODO: make sure that looooong labels don't make the flex container for the
  // plugins sidebar wider that is should be
  return (
    <li className={'graphiql-history-item' + (isEditable ? ' editable' : '')}>
      {isEditable ? (
        <input
          type="text"
          defaultValue={props.item.label}
          ref={editField}
          onBlur={e => {
            e.stopPropagation();
            setIsEditable(false);
            editLabel({ ...props.item, label: e.target.value });
          }}
          onKeyDown={e => {
            if (e.keyCode === 13) {
              e.stopPropagation();
              setIsEditable(false);
              editLabel({ ...props.item, label: e.currentTarget.value });
            }
          }}
          placeholder="Type a label"
        />
      ) : (
        <>
          <UnstyledButton
            className="graphiql-history-item-label"
            onClick={() => {
              selectHistoryItem(props.item);
            }}>
            {displayName}
          </UnstyledButton>
          <UnstyledButton
            className="graphiql-history-item-action"
            title="Edit label"
            onClick={e => {
              e.stopPropagation();
              setIsEditable(true);
            }}>
            <PenIcon />
          </UnstyledButton>
          <UnstyledButton
            className="graphiql-history-item-action"
            onClick={e => {
              e.stopPropagation();
              toggleFavorite(props.item);
            }}
            title={props.item.favorite ? 'Remove favorite' : 'Add favorite'}>
            {props.item.favorite ? <StarFilledIcon /> : <StarIcon />}
          </UnstyledButton>
        </>
      )}
    </li>
  );
}

export function formatQuery(query?: string) {
  return query
    ?.split('\n')
    .map(line => line.replace(/#(.*)/, ''))
    .join(' ')
    .replace(/{/g, ' { ')
    .replace(/}/g, ' } ')
    .replace(/[\s]{2,}/g, ' ');
}
