import { isEmpty } from '@hanlogy/ts-lib';
import { buildConditionExpression } from './buildConditionExpression';
import type { QueryConfig, QueryInput } from './types';

export function buildQueryInput({
  tableName,
  indexName,
  keyConditions,
  projections,
  exclusiveStartKey,
  descending,
  limit,
}: QueryConfig & { tableName: string }): QueryInput {
  const {
    expression: conditionExpression,
    names: conditionNames,
    values: conditionValues,
  } = buildConditionExpression(keyConditions);

  const expressionAttributeNames = { ...conditionNames };
  const expressionAttributeValues = { ...conditionValues };

  let projectionExpression: string | undefined;
  if (projections?.length) {
    const expressionParts: string[] = [];
    for (const name of projections) {
      const attrAlias = `#${name}` as const;
      expressionAttributeNames[attrAlias] = name;
      expressionParts.push(attrAlias);
    }
    projectionExpression = expressionParts.join(', ');
  }

  return {
    TableName: tableName,
    KeyConditionExpression: conditionExpression,
    ...(!isEmpty(expressionAttributeNames) && {
      ExpressionAttributeNames: expressionAttributeNames,
    }),
    ...(!isEmpty(expressionAttributeValues) && {
      ExpressionAttributeValues: expressionAttributeValues,
    }),
    ...(limit && { Limit: limit }),
    ...(indexName && { IndexName: indexName }),
    ...(projectionExpression && {
      ProjectionExpression: projectionExpression,
    }),
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    ...(descending === true && { ScanIndexForward: false }),
  };
}
