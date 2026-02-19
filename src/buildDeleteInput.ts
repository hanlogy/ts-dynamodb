import { buildConditionExpression } from './buildConditionExpression';
import type { DeleteConfig, DeleteInput, Keys, SingleTableKeys } from './types';

export function buildDeleteInput<KeysT extends Keys = SingleTableKeys>({
  tableName,
  keys,
  conditions,
}: DeleteConfig<KeysT> & { tableName: string }): DeleteInput<KeysT> {
  const { expression, names, values } = buildConditionExpression(conditions);

  return {
    TableName: tableName,
    Key: keys,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: expression,
  };
}
