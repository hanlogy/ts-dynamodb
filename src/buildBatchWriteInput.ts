import type { BatchWriteConfig, BatchWriteInput } from './types';

export function buildBatchWriteInput({
  tableName,
  put: putItems = [],
  delete: deleteItems = [],
}: BatchWriteConfig & { tableName: string }): BatchWriteInput {
  return {
    RequestItems: {
      [tableName]: [
        ...putItems.map((item) => ({ PutRequest: { Item: item } })),
        ...deleteItems.map((item) => ({ DeleteRequest: { Key: item } })),
      ],
    },
  };
}
