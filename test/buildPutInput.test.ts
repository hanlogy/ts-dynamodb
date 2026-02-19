import { buildPutInput } from '@/buildPutInput';
import type { Condition } from '@/types';

const tableName = 'MyTable';
const now = '2026-01-01T00:00:00.000Z';

describe('buildPutInput', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(now));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('default', () => {
    const item = {
      pk: 'P#1',
      sk: 'S#1',
      status: 'ACTIVE',
    };

    const result = buildPutInput({
      tableName,
      keyNames: ['pk', 'sk'],
      item,
    });

    expect(result).toEqual({
      TableName: tableName,
      Item: {
        pk: 'P#1',
        sk: 'S#1',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ConditionExpression:
        'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
    });

    // Original data is not mutated.
    expect(item).toEqual({ pk: 'P#1', sk: 'S#1', status: 'ACTIVE' });
  });

  test('preventOverwrite is false', () => {
    const item = { pk: 'P#1', sk: 'S#1' };

    const result = buildPutInput({
      tableName,
      keyNames: ['pk', 'sk'],
      item,
      preventOverwrite: false,
    });

    expect(result).toEqual({
      TableName: tableName,
      Item: {
        pk: 'P#1',
        sk: 'S#1',
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  test('timestamp is false', () => {
    const item = { pk: 'P#1', sk: 'S#1' };

    const result = buildPutInput({
      tableName,
      keyNames: ['pk', 'sk'],
      item,
      timestamp: false,
    });

    expect(result).toEqual({
      TableName: tableName,
      Item: {
        pk: 'P#1',
        sk: 'S#1',
      },
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ConditionExpression:
        'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
    });
  });

  test('with conditions', () => {
    const item = { pk: 'P#1', sk: 'S#1' };
    const conditions: Condition = {
      attribute: 'status',
      operator: '=',
      value: 'ACTIVE',
    };

    const result = buildPutInput({
      tableName,
      keyNames: ['pk', 'sk'],
      item,
      conditions,
    });

    expect(result).toEqual({
      TableName: tableName,
      Item: {
        pk: 'P#1',
        sk: 'S#1',
        createdAt: now,
        updatedAt: now,
      },
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'ACTIVE',
      },
      ConditionExpression:
        '(attribute_not_exists(#pk) AND attribute_not_exists(#sk)) AND #status = :status',
    });
  });
});
