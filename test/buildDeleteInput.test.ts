import { buildDeleteInput } from '@/buildDeleteInput';
import { type SingleTableKeys, type Condition } from '@/types';

const tableName = 'MyTable';
const keys: SingleTableKeys = { pk: 'P#1', sk: 'S#1' };

describe('buildDeleteInput', () => {
  test('no conditions', () => {
    const result = buildDeleteInput({ tableName, keys });

    expect(result).toEqual({
      TableName: tableName,
      Key: keys,
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      ConditionExpression: undefined,
    });
  });

  test('with conditions', () => {
    const conditions: Condition = {
      attribute: 'status',
      operator: '=',
      value: 'ACTIVE',
    };

    const result = buildDeleteInput({ tableName, keys, conditions });

    expect(result).toEqual({
      TableName: tableName,
      Key: keys,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'ACTIVE',
      },
      ConditionExpression: '#status = :status',
    });
  });

  test('with order', () => {
    const conditions: Condition[] = [
      { attribute: 'a', operator: '>=', value: 1 },
      { link: 'OR', attribute: 'b', operator: 'exists' },
    ];

    const result = buildDeleteInput({ tableName, keys, conditions });

    expect(result.ConditionExpression).toBe('#a >= :a OR attribute_exists(#b)');
  });
});
