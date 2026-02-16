import { buildQueryInput } from '@/buildQueryInput';
import type { Condition, ExclusiveStartKey } from '@/types';

const tableName = 'MyTable';

describe('buildQueryInput', () => {
  test('no options', () => {
    const result = buildQueryInput({ tableName });

    expect(result).toEqual({
      TableName: tableName,
      KeyConditionExpression: undefined,
    });
  });

  test('with key conditions', () => {
    const keyConditions = {
      attribute: 'pk',
      value: 'P#1',
    };

    const result = buildQueryInput({ tableName, keyConditions });

    expect(result).toEqual({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'P#1',
      },
    });
  });

  test('with projections', () => {
    const projections = ['a', 'b'];

    const result = buildQueryInput({ tableName, projections });

    expect(result).toEqual({
      TableName: tableName,
      KeyConditionExpression: undefined,
      ExpressionAttributeNames: {
        '#a': 'a',
        '#b': 'b',
      },
      ProjectionExpression: '#a, #b',
    });
  });

  test('merge projections and conditions', () => {
    const keyConditions: Condition = {
      attribute: 'pk',
      value: 'P#1',
    };
    const projections = ['pk', 'sk'];

    const result = buildQueryInput({ tableName, keyConditions, projections });

    expect(result).toEqual({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'P#1',
      },
      ProjectionExpression: '#pk, #sk',
    });
  });

  test('with index and pagination', () => {
    const keyConditions: Condition = {
      attribute: 'pk',
      value: 'P#1',
    };

    const exclusiveStartKey: ExclusiveStartKey = { pk: 'P#0', sk: 'S#0' };

    const result = buildQueryInput({
      tableName,
      indexName: 'GSI1',
      keyConditions,
      limit: 10,
      exclusiveStartKey,
      descending: true,
    });

    expect(result).toEqual({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'P#1',
      },
      Limit: 10,
      IndexName: 'GSI1',
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: false,
    });
  });
});
