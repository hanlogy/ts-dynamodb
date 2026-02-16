import { isEmpty } from '@hanlogy/ts-lib';
import { buildConditionExpression } from './buildConditionExpression';
import type { Condition, PutConfig, PutInput, AnyRecord } from './types';

export function buildPutInput<T extends AnyRecord = AnyRecord>({
  tableName,
  keyNames,
  attributes,
  conditions,
  timestamp,
  preventOverwrite,
}: PutConfig<T> & { tableName: string }): PutInput {
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
    Item: resolveAttributes(attributes, timestamp),
    ...(!isEmpty(names) && { ExpressionAttributeNames: names }),
    ...(!isEmpty(values) && { ExpressionAttributeValues: values }),
    ...(expression && { ConditionExpression: expression }),
  };
}

function resolveAttributes<T extends object>(
  attributes: T,
  timestamp: boolean | undefined,
): T & { createdAt?: string; updatedAt?: string } {
  if (timestamp === false) {
    return { ...attributes };
  }

  const now = new Date().toISOString();

  let existingCreatedAt: unknown;
  let existingUpdatedAt: unknown;

  if ('createdAt' in attributes) {
    existingCreatedAt = attributes.createdAt;
  }
  if ('updatedAt' in attributes) {
    existingUpdatedAt = attributes.updatedAt;
  }

  return {
    ...attributes,
    createdAt: typeof existingCreatedAt === 'string' ? existingCreatedAt : now,
    updatedAt: typeof existingUpdatedAt === 'string' ? existingUpdatedAt : now,
  };
}
