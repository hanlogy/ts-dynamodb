import { buildBatchWriteInput } from '@/buildBatchWriteInput';

describe('buildBatchWriteInput', () => {
  const tableName = 'MyTable';

  test('no put, nodelete', () => {
    const result = buildBatchWriteInput({ tableName });

    expect(result).toEqual({
      RequestItems: {
        [tableName]: [],
      },
    });
  });

  test('with put items', () => {
    const putItems = [
      { pk: 'p1', sk: 's1', a: 1 },
      { pk: 'p2', sk: 's2', b: 'x' },
    ];

    const result = buildBatchWriteInput({ tableName, put: putItems });

    expect(result).toEqual({
      RequestItems: {
        [tableName]: [
          { PutRequest: { Item: putItems[0] } },
          { PutRequest: { Item: putItems[1] } },
        ],
      },
    });
  });

  test('with delete items', () => {
    const deleteItems = [{ pk: 'p1', sk: 's1' }];

    const result = buildBatchWriteInput({ tableName, delete: deleteItems });

    expect(result).toEqual({
      RequestItems: {
        [tableName]: [{ DeleteRequest: { Key: deleteItems[0] } }],
      },
    });
  });

  test('with both put items and delete items', () => {
    const putItems = [{ pk: 'p1', sk: 's1' }];
    const deleteItems = [{ pk: 'p2', sk: 's2' }];

    const result = buildBatchWriteInput({
      tableName,
      put: putItems,
      delete: deleteItems,
    });

    expect(result.RequestItems[tableName]).toEqual([
      { PutRequest: { Item: putItems[0] } },
      { DeleteRequest: { Key: deleteItems[0] } },
    ]);
  });

  test('does not mutate input arrays', () => {
    const putItems = [{ pk: 'p1', sk: 's1' }];
    const deleteItems = [{ pk: 'p2', sk: 's2' }];

    const putSnapshot = structuredClone(putItems);
    const deleteSnapshot = structuredClone(deleteItems);

    buildBatchWriteInput({ tableName, put: putItems, delete: deleteItems });

    expect(putItems).toEqual(putSnapshot);
    expect(deleteItems).toEqual(deleteSnapshot);
  });
});
