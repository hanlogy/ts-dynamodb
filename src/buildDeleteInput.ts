import { buildConditionExpression } from './buildConditionExpression';
import type { DeleteConfig, DeleteInput, Keys, SingleTableKeys } from './types';

export function buildDeleteInput<K extends Keys = SingleTableKeys>({
  tableName,
  keys,
  conditions,
}: DeleteConfig<K> & { tableName: string }): DeleteInput<K> {
  const { expression, names, values } = buildConditionExpression(conditions);

  return {
    TableName: tableName,
    Key: keys,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: expression,
  };
}
