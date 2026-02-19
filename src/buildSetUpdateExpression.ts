import { isEmpty } from '@hanlogy/ts-lib';
import type {
  PlaceholderNames,
  PlaceholderValues,
  SetUpdateExpression,
  UnknownRecord,
} from './types';

export function buildSetUpdateExpression(
  attributes: UnknownRecord,
): SetUpdateExpression {
  if (isEmpty(attributes)) {
    throw new Error('parseSetAttributes: attributes cannot be empty');
  }

  const names: PlaceholderNames = {};
  const values: PlaceholderValues = {};
  const updateParts: string[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }

    const attrAlias = `#${key}` as const;
    const valAlias = `:${key}` as const;
    names[attrAlias] = key;
    values[valAlias] = attributes[key];
    updateParts.push(`${attrAlias} = ${valAlias}`);
  }

  if (!updateParts.length) {
    throw new Error('No valid fields to set');
  }

  const expression = `SET ${updateParts.join(', ')}`;

  return {
    expression,
    names,
    values,
  };
}
