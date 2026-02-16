// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html

import type {
  Condition,
  MaybeConditions,
  ParsedCondition,
  PlaceholderNames,
  PlaceholderValues,
} from './types';

interface Options {
  ignoreFirstLink?: boolean;
}

function build(
  conditions: readonly Condition[],
  names: PlaceholderNames,
  values: PlaceholderValues,
  options: Options,
): string | undefined {
  const ignoreFirstLink = options.ignoreFirstLink !== false;

  // TODO: We should clean up the empty ones first, otherwise the
  // withParentheses is not accurate, for example if there is a following empty
  // group.

  const parts = conditions
    .map((cond, i) => {
      let expression: string | undefined;

      if ('conditions' in cond) {
        const withParentheses =
          cond.conditions.length > 1 && (i > 0 || i + 1 < conditions.length);
        const nested = build(cond.conditions, names, values, options);

        // Skip empty groups
        if (!nested) {
          return undefined;
        }

        expression = withParentheses ? `(${nested})` : nested;
      } else {
        const { operator, attribute } = cond;
        const attrAlias = `#${attribute}` as const;
        names[attrAlias] = attribute;

        switch (operator) {
          case 'exists':
            expression = `attribute_exists(${attrAlias})`;
            break;
          case 'not_exists':
            expression = `attribute_not_exists(${attrAlias})`;
            break;
          case 'begins_with': {
            const valAlias = `:${attribute}_prefix` as const;
            values[valAlias] = cond.value;
            expression = `begins_with(${attrAlias}, ${valAlias})`;
            break;
          }
          default: {
            const valAlias = `:${attribute}` as const;
            values[valAlias] = cond.value;
            expression = `${attrAlias} ${operator ?? '='} ${valAlias}`;
            break;
          }
        }
      }

      if (!expression) {
        return undefined;
      }

      const link =
        i === 0
          ? ignoreFirstLink
            ? ''
            : (cond.link ?? '')
          : (cond.link ?? 'AND');
      return link ? `${link} ${expression}` : expression;
    })
    .filter(Boolean);

  return parts.length ? parts.join(' ') : undefined;
}

export function buildConditionExpression(
  conditions?: MaybeConditions,
  options: Options = {},
): ParsedCondition {
  const names: PlaceholderNames = {};
  const values: PlaceholderValues = {};

  const list = conditions
    ? Array.isArray(conditions)
      ? conditions
      : [conditions]
    : [];

  const expression = list.length
    ? build(list, names, values, options)
    : undefined;

  return { expression, names, values };
}
