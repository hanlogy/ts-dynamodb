import { buildSetUpdateExpression } from '@/buildSetUpdateExpression';

describe('buildSetUpdateExpression', () => {
  test('empty', () => {
    expect(() => {
      buildSetUpdateExpression({});
    }).toThrow('parseSetAttributes: attributes cannot be empty');
  });

  test('all undefined', () => {
    expect(() => {
      buildSetUpdateExpression({ a: undefined });
    }).toThrow('No valid fields to set');
  });

  test('skip undefined', () => {
    const result = buildSetUpdateExpression({ a: undefined, b: 2 });

    expect(result).toEqual({
      expression: 'SET #b = :b',
      names: { '#b': 'b' },
      values: { ':b': 2 },
    });
  });

  test('multiple fields', () => {
    const result = buildSetUpdateExpression({ a: 1, b: 'x' });

    expect(result).toEqual({
      expression: 'SET #a = :a, #b = :b',
      names: { '#a': 'a', '#b': 'b' },
      values: { ':a': 1, ':b': 'x' },
    });
  });
});
