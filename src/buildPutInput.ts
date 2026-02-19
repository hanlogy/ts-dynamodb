import { isEmpty } from '@hanlogy/ts-lib';
import { buildConditionExpression } from './buildConditionExpression';
import type { Condition, PutConfig, PutInput, UnknownRecord } from './types';

export function buildPutInput<ItemT extends object = UnknownRecord>({
  tableName,
  returnValues,
  keyNames,
  item,
  conditions,
  timestamp,
  preventOverwrite,
}: PutConfig<ItemT> & { tableName: string }): PutInput<ItemT> {
  const resolvedConditions: Condition[] = [];

  if (preventOverwrite !== false) {
    resolvedConditions.push({
      conditions: keyNames.map((e) => ({
        attribute: e,
        operator: 'not_exists',
      })),
    });
  }

  if (Array.isArray(conditions)) {
    resolvedConditions.push(...conditions);
  } else if (conditions) {
    resolvedConditions.push(conditions);
  }

  const { expression, names, values } =
    buildConditionExpression(resolvedConditions);

  return {
    TableName: tableName,
    ...(returnValues && { ReturnValues: returnValues }),
    Item: resolveAttributes(item, timestamp),
    ...(!isEmpty(names) && { ExpressionAttributeNames: names }),
    ...(!isEmpty(values) && { ExpressionAttributeValues: values }),
    ...(expression && { ConditionExpression: expression }),
  };
}

function resolveAttributes<ItemT extends object>(
  item: ItemT,
  timestamp: boolean | undefined,
): ItemT & { createdAt?: string; updatedAt?: string } {
  if (timestamp === false) {
    return { ...item };
  }

  const now = new Date().toISOString();

  let existingCreatedAt: unknown;
  let existingUpdatedAt: unknown;

  if ('createdAt' in item) {
    existingCreatedAt = item.createdAt;
  }
  if ('updatedAt' in item) {
    existingUpdatedAt = item.updatedAt;
  }

  return {
    ...item,
    createdAt: typeof existingCreatedAt === 'string' ? existingCreatedAt : now,
    updatedAt: typeof existingUpdatedAt === 'string' ? existingUpdatedAt : now,
  };
}
