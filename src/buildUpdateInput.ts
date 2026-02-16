import { isEmpty } from '@hanlogy/ts-lib';
import type {
  Condition,
  Keys,
  PlaceholderNames,
  PlaceholderValues,
  SingleTableKeys,
  AnyRecord,
  UpdateConfig,
  UpdateInput,
} from './types';
import { buildConditionExpression } from './buildConditionExpression';
import { buildSetUpdateExpression } from './buildSetUpdateExpression';

// NOTE: The return value is partially `UpdateCommandInput`.
export function buildUpdateInput<
  T extends AnyRecord = AnyRecord,
  K extends Keys = SingleTableKeys,
>({
  tableName,
  keys,
  setAttributes,
  removeAttributes,
  upsert,
  conditions,
  timestamp,
}: UpdateConfig<T, K> & { tableName: string }): UpdateInput<K> {
  const expressionParts: string[] = [];
  const placeholderNames: PlaceholderNames = {};
  const placeholderValues: PlaceholderValues = {};

  const setAttributesResolved = { ...setAttributes };

  if (timestamp !== false && setAttributesResolved.updatedAt === undefined) {
    setAttributesResolved.updatedAt = new Date().toISOString();
  }

  if (!isEmpty(setAttributesResolved)) {
    const { expression, names, values } = buildSetUpdateExpression(
      setAttributesResolved,
    );
    expressionParts.push(expression);
    Object.assign(placeholderNames, names);
    Object.assign(placeholderValues, values);
  }

  if (removeAttributes?.length) {
    const removeParts: string[] = [];
    for (const name of removeAttributes) {
      const attrAlias = `#${name}` as const;
      placeholderNames[attrAlias] = name;
      removeParts.push(attrAlias);
    }
    expressionParts.push(`REMOVE ${removeParts.join(', ')}`);
  }

  const finalConditions: Condition[] = [];
  if (upsert !== true) {
    finalConditions.push({
      conditions: Object.keys(keys).map((e) => ({
        attribute: e,
        operator: 'exists',
      })),
    });
  }

  if (Array.isArray(conditions)) {
    finalConditions.push(...conditions);
  } else if (conditions) {
    finalConditions.push(conditions);
  }

  const {
    expression: conditionExpression,
    names: conditionNames,
    values: conditionValues,
  } = buildConditionExpression(finalConditions);

  const expressionAttributeNames = { ...placeholderNames, ...conditionNames };
  const expressionAttributeValues = {
    ...placeholderValues,
    ...conditionValues,
  };

  if (!expressionParts.length) {
    throw new Error('Nothing to update');
  }

  return {
    TableName: tableName,
    Key: keys,
    UpdateExpression: expressionParts.join(' '),
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
    ...(!isEmpty(expressionAttributeNames) && {
      ExpressionAttributeNames: expressionAttributeNames,
    }),
    ...(!isEmpty(expressionAttributeValues) && {
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  };
}
