import {
  // @ts-expect-error
  fireEvent,
  render,
} from '@testing-library/react';
import { ComponentProps } from 'react';
import { formatQuery, HistoryItem } from '../components';
import { HistoryContextProvider } from '../context';
import { useSelectHistoryItem } from '../hooks';

jest.mock('../hooks', () => {
  const mockedSelect = jest.fn();
  return { useSelectHistoryItem: () => mockedSelect };
});

const mockQuery = /* GraphQL */ `
  query Test($string: String) {
    test {
      hasArgs(string: $string)
    }
  }
`;

const mockVariables = JSON.stringify({ string: 'string' });

const mockHeaders = JSON.stringify({ foo: 'bar' });

const mockOperationName = 'Test';

type QueryHistoryItemProps = ComponentProps<typeof HistoryItem>;

function QueryHistoryItemWithContext(props: QueryHistoryItemProps) {
  return (
    <HistoryContextProvider>
      <HistoryItem {...props} />
    </HistoryContextProvider>
  );
}

const baseMockProps: QueryHistoryItemProps = {
  item: {
    query: mockQuery,
    variables: mockVariables,
    headers: mockHeaders,
    favorite: false,
  },
};

function getMockProps(
  customProps?: Partial<QueryHistoryItemProps>,
): QueryHistoryItemProps {
  return {
    ...baseMockProps,
    ...customProps,
    item: { ...baseMockProps.item, ...customProps?.item },
  };
}

describe('QueryHistoryItem', () => {
  beforeEach(() => {
    (useSelectHistoryItem() as jest.Mock).mockClear();
  });
  it('renders operationName if label is not provided', () => {
    const otherMockProps = { item: { operationName: mockOperationName } };
    const props = getMockProps(otherMockProps);
    const { container } = render(<QueryHistoryItemWithContext {...props} />);
    expect(
      container.querySelector('button.graphiql-history-item-label')!
        .textContent,
    ).toBe(mockOperationName);
  });

  it('renders a string version of the query if label or operation name are not provided', () => {
    const { container } = render(
      <QueryHistoryItemWithContext {...getMockProps()} />,
    );
    expect(
      container.querySelector('button.graphiql-history-item-label')!
        .textContent,
    ).toBe(formatQuery(mockQuery));
  });

  it('selects the item when history label button is clicked', () => {
    const otherMockProps = { item: { operationName: mockOperationName } };
    const mockProps = getMockProps(otherMockProps);
    const { container } = render(
      <QueryHistoryItemWithContext {...mockProps} />,
    );
    fireEvent.click(
      container.querySelector('button.graphiql-history-item-label')!,
    );
    expect(useSelectHistoryItem()).toHaveBeenCalledTimes(1);
    expect(useSelectHistoryItem()).toHaveBeenCalledWith(mockProps.item);
  });

  it('renders label input if the edit label button is clicked', () => {
    const { container, getByTitle } = render(
      <QueryHistoryItemWithContext {...getMockProps()} />,
    );
    fireEvent.click(getByTitle('Edit label'));
    expect(container.querySelectorAll('li.editable').length).toBe(1);
    expect(container.querySelectorAll('input').length).toBe(1);
    expect(
      container.querySelectorAll('button.graphiql-history-item-label').length,
    ).toBe(0);
  });
});
