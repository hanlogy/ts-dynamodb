import { buildUpdateInput } from '@/buildUpdateInput';
import { buildConditionExpression } from '@/buildConditionExpression';
import { buildSetUpdateExpression } from '@/buildSetUpdateExpression';

jest.mock('@/buildConditionExpression', () => {
  return { buildConditionExpression: jest.fn() };
});
jest.mock('@/buildSetUpdateExpression', () => {
  return { buildSetUpdateExpression: jest.fn() };
});

const buildConditionExpressionMock = jest.mocked(buildConditionExpression);
const buildSetUpdateExpressionMock = jest.mocked(buildSetUpdateExpression);

describe('buildUpdateInput', () => {
  const tableName = 'TestTable';
  const testPk = 'pk-1';
  const testSk = 'sk-1';
  const now = '2025-09-01T12:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(now));

    buildConditionExpressionMock.mockReset();
    buildSetUpdateExpressionMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a basic update command', () => {
    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #age = :age, #name = :name, #updatedAt = :updatedAt',
      names: {
        '#age': 'age',
        '#name': 'name',
        '#updatedAt': 'updatedAt',
      },
      values: {
        ':age': 30,
        ':name': 'Alice',
        ':updatedAt': now,
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression: 'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      setAttributes: { age: 30, name: 'Alice' },
      conditions: [],
    });

    expect(input).toEqual({
      TableName: tableName,
      Key: { testPk, testSk },
      UpdateExpression:
        'SET #age = :age, #name = :name, #updatedAt = :updatedAt',
      ConditionExpression:
        'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      ExpressionAttributeNames: {
        '#age': 'age',
        '#name': 'name',
        '#updatedAt': 'updatedAt',
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      ExpressionAttributeValues: {
        ':age': 30,
        ':name': 'Alice',
        ':updatedAt': now,
      },
    });

    expect(buildSetUpdateExpressionMock).toHaveBeenCalledWith({
      age: 30,
      name: 'Alice',
      updatedAt: now,
    });
  });

  test('include simple conditions', () => {
    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #age = :age, #updatedAt = :updatedAt',
      names: {
        '#age': 'age',
        '#updatedAt': 'updatedAt',
      },
      values: {
        ':age': 31,
        ':updatedAt': now,
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression:
        '(attribute_exists(#testPk) AND attribute_exists(#testSk)) AND #active = :active',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
        '#active': 'active',
      },
      values: {
        ':active': true,
      },
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      setAttributes: { age: 31 },
      conditions: [{ attribute: 'active', operator: '=', value: true }],
    });

    expect(input.ConditionExpression).toBe(
      '(attribute_exists(#testPk) AND attribute_exists(#testSk)) AND #active = :active',
    );
    expect(input.ExpressionAttributeNames).toHaveProperty('#active');
    expect(input.ExpressionAttributeValues).toHaveProperty(':active', true);

    expect(buildConditionExpressionMock).toHaveBeenCalledWith([
      {
        conditions: [
          { attribute: 'testPk', operator: 'exists' },
          { attribute: 'testSk', operator: 'exists' },
        ],
      },
      { attribute: 'active', operator: '=', value: true },
    ]);
  });

  test('with removeAttributes', () => {
    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #updatedAt = :updatedAt',
      names: {
        '#updatedAt': 'updatedAt',
      },
      values: {
        ':updatedAt': now,
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression: 'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      removeAttributes: ['name'],
    });

    expect(input).toEqual({
      TableName: tableName,
      Key: { testPk, testSk },
      UpdateExpression: 'SET #updatedAt = :updatedAt REMOVE #name',
      ConditionExpression:
        'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
        '#name': 'name',
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      ExpressionAttributeValues: { ':updatedAt': now },
    });

    expect(buildSetUpdateExpressionMock).toHaveBeenCalledWith({
      updatedAt: now,
    });
  });

  test('when upsert is true', () => {
    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #age = :age, #name = :name, #updatedAt = :updatedAt',
      names: {
        '#age': 'age',
        '#name': 'name',
        '#updatedAt': 'updatedAt',
      },
      values: {
        ':age': 30,
        ':name': 'Alice',
        ':updatedAt': now,
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression: undefined,
      names: {},
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      upsert: true,
      keys: { testPk, testSk },
      setAttributes: { age: 30, name: 'Alice' },
    });

    expect(input.ConditionExpression).toBeFalsy();

    expect(buildConditionExpressionMock).toHaveBeenCalledWith([]);
  });

  test('when timestamp is false', () => {
    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #name = :name',
      names: {
        '#name': 'name',
      },
      values: {
        ':name': 'foo',
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression: 'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      setAttributes: { name: 'foo' },
      timestamp: false,
    });

    expect(input).toEqual({
      TableName: tableName,
      Key: { testPk, testSk },
      UpdateExpression: 'SET #name = :name',
      ConditionExpression:
        'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      ExpressionAttributeValues: { ':name': 'foo' },
    });

    expect(buildSetUpdateExpressionMock).toHaveBeenCalledWith({ name: 'foo' });
  });

  test('when updatedAt attribute is given', () => {
    const updatedAt = '2025-08-10T10:00:00.000Z';

    buildSetUpdateExpressionMock.mockReturnValueOnce({
      expression: 'SET #name = :name, #updatedAt = :updatedAt',
      names: {
        '#name': 'name',
        '#updatedAt': 'updatedAt',
      },
      values: {
        ':name': 'foo',
        ':updatedAt': updatedAt,
      },
    });

    buildConditionExpressionMock.mockReturnValueOnce({
      expression: 'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      setAttributes: { name: 'foo', updatedAt },
    });

    expect(input.ExpressionAttributeValues).toEqual({
      ':name': 'foo',
      ':updatedAt': updatedAt,
    });

    expect(buildSetUpdateExpressionMock).toHaveBeenCalledWith({
      name: 'foo',
      updatedAt,
    });
  });

  test('nothing to update', () => {
    buildConditionExpressionMock.mockReturnValueOnce({
      expression: undefined,
      names: {},
      values: {},
    });

    expect(() => {
      buildUpdateInput({
        tableName,
        keys: { testPk, testSk },
        timestamp: false,
      });
    }).toThrow('Nothing to update');

    expect(buildSetUpdateExpressionMock).not.toHaveBeenCalled();
  });

  test('remove only without values', () => {
    buildConditionExpressionMock.mockReturnValueOnce({
      expression: 'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      names: {
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
      values: {},
    });

    const input = buildUpdateInput({
      tableName,
      keys: { testPk, testSk },
      removeAttributes: ['name'],
      timestamp: false,
    });

    expect(input).toEqual({
      TableName: tableName,
      Key: { testPk, testSk },
      UpdateExpression: 'REMOVE #name',
      ConditionExpression:
        'attribute_exists(#testPk) AND attribute_exists(#testSk)',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#testPk': 'testPk',
        '#testSk': 'testSk',
      },
    });

    expect(buildSetUpdateExpressionMock).not.toHaveBeenCalled();
  });
});
