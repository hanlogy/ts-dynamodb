import { buildTransactWriteInput } from '@/buildTransactWriteInput';
import { buildPutInput } from '@/buildPutInput';
import { buildUpdateInput } from '@/buildUpdateInput';
import { buildDeleteInput } from '@/buildDeleteInput';
import type { PutConfig } from '@/types';

jest.mock('@/buildPutInput', () => {
  return { buildPutInput: jest.fn() };
});
jest.mock('@/buildUpdateInput', () => {
  return { buildUpdateInput: jest.fn() };
});
jest.mock('@/buildDeleteInput', () => {
  return { buildDeleteInput: jest.fn() };
});

const buildPutInputMock = jest.mocked(buildPutInput);
const buildUpdateInputMock = jest.mocked(buildUpdateInput);
const buildDeleteInputMock = jest.mocked(buildDeleteInput);

describe('buildTransactWriteInput', () => {
  const tableName = 'TestTable';

  beforeEach(() => {
    buildPutInputMock.mockReset();
    buildUpdateInputMock.mockReset();
    buildDeleteInputMock.mockReset();
  });

  test('empty', () => {
    const input = buildTransactWriteInput({ tableName });

    expect(input).toEqual({ TransactItems: [] });
    expect(buildPutInputMock).not.toHaveBeenCalled();
    expect(buildUpdateInputMock).not.toHaveBeenCalled();
    expect(buildDeleteInputMock).not.toHaveBeenCalled();
  });

  test('put', () => {
    const putItem1: PutConfig = { attributes: { pk: 'P#1' }, keyNames: ['pk'] };
    const putItem2: PutConfig = { attributes: { pk: 'P#2' }, keyNames: ['pk'] };

    const putInput1 = { TableName: tableName, Item: { pk: 'P#1' } };
    const putInput2 = { TableName: tableName, Item: { pk: 'P#2' } };

    buildPutInputMock.mockReturnValueOnce(putInput1);
    buildPutInputMock.mockReturnValueOnce(putInput2);

    const input = buildTransactWriteInput({
      tableName,
      put: [putItem1, putItem2],
    });

    expect(input).toEqual({
      TransactItems: [{ Put: putInput1 }, { Put: putInput2 }],
    });

    expect(buildPutInputMock).toHaveBeenCalledTimes(2);
    expect(buildPutInputMock).toHaveBeenNthCalledWith(1, {
      tableName,
      ...putItem1,
    });
    expect(buildPutInputMock).toHaveBeenNthCalledWith(2, {
      tableName,
      ...putItem2,
    });
  });

  test('update', () => {
    const updateItem = {
      keys: { pk: 'P#1', sk: 'S#1' },
      setAttributes: { a: 1 },
    };

    const updateInput = {
      TableName: tableName,
      Key: { pk: 'P#1', sk: 'S#1' },
      UpdateExpression: 'SET #a = :a',
    };

    buildUpdateInputMock.mockReturnValueOnce(updateInput);

    const input = buildTransactWriteInput({
      tableName,
      update: [updateItem],
    });

    expect(input).toEqual({
      TransactItems: [{ Update: updateInput }],
    });

    expect(buildUpdateInputMock).toHaveBeenCalledTimes(1);
    expect(buildUpdateInputMock).toHaveBeenCalledWith({
      tableName,
      ...updateItem,
    });
  });

  test('delete', () => {
    const deleteItem = { keys: { pk: 'P#1', sk: 'S#1' } };

    const deleteInput = {
      TableName: tableName,
      Key: { pk: 'P#1', sk: 'S#1' },
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
    };

    buildDeleteInputMock.mockReturnValueOnce(deleteInput);

    const input = buildTransactWriteInput({
      tableName,
      delete: [deleteItem],
    });

    expect(input).toEqual({
      TransactItems: [{ Delete: deleteInput }],
    });

    expect(buildDeleteInputMock).toHaveBeenCalledTimes(1);
    expect(buildDeleteInputMock).toHaveBeenCalledWith({
      tableName,
      ...deleteItem,
    });
  });

  test('order', () => {
    const putItem: PutConfig = { attributes: { pk: 'P#1' }, keyNames: ['pk'] };
    const updateItem = {
      keys: { pk: 'P#1', sk: 'S#1' },
      setAttributes: { a: 1 },
    };
    const deleteItem = { keys: { pk: 'P#2', sk: 'S#2' } };

    const putInput = { TableName: tableName, Item: { pk: 'P#1' } };
    const updateInput = {
      TableName: tableName,
      Key: { pk: 'P#1', sk: 'S#1' },
      UpdateExpression: 'SET #a = :a',
    };
    const deleteInput = {
      TableName: tableName,
      Key: { pk: 'P#2', sk: 'S#2' },
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
    };

    buildPutInputMock.mockReturnValueOnce(putInput);
    buildUpdateInputMock.mockReturnValueOnce(updateInput);
    buildDeleteInputMock.mockReturnValueOnce(deleteInput);

    const input = buildTransactWriteInput({
      tableName,
      put: [putItem],
      update: [updateItem],
      delete: [deleteItem],
    });

    expect(input).toEqual({
      TransactItems: [
        { Put: putInput },
        { Update: updateInput },
        { Delete: deleteInput },
      ],
    });
  });
});
