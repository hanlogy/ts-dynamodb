import { buildConditionExpression } from '@/buildConditionExpression';

describe('buildConditionExpression', () => {
  test('conditions is undefined', () => {
    const result = buildConditionExpression();
    expect(result.expression).toBeUndefined();
    expect(result.names).toEqual({});
    expect(result.values).toEqual({});
  });

  test('conditions is null', () => {
    const result = buildConditionExpression(null);
    expect(result.expression).toBeUndefined();
    expect(result.names).toEqual({});
    expect(result.values).toEqual({});
  });

  test('conditions is empty', () => {
    const result = buildConditionExpression(null);
    expect(result.expression).toBeUndefined();
    expect(result.names).toEqual({});
    expect(result.values).toEqual({});
  });

  test('single exists condition', () => {
    const result = buildConditionExpression({ attribute: 'pk', operator: 'exists' });
    expect(result.expression).toBe('attribute_exists(#pk)');
    expect(result.names).toEqual({ '#pk': 'pk' });
    expect(result.values).toEqual({});
  });

  test('single not_exists condition', () => {
    const result = buildConditionExpression({ attribute: 'sk', operator: 'not_exists' });
    expect(result.expression).toBe('attribute_not_exists(#sk)');
    expect(result.names).toEqual({ '#sk': 'sk' });
    expect(result.values).toEqual({});
  });

  test('single begins_with condition', () => {
    const result = buildConditionExpression({
      attribute: 'sk',
      operator: 'begins_with',
      value: '01#',
    });
    expect(result.expression).toBe('begins_with(#sk, :sk_prefix)');
    expect(result.names).toEqual({ '#sk': 'sk' });
    expect(result.values).toEqual({ ':sk_prefix': '01#' });
  });

  test('= condition with value', () => {
    const result = buildConditionExpression({
      attribute: 'age',
      operator: '=',
      value: 30,
    });
    expect(result.expression).toBe('#age = :age');
    expect(result.names).toEqual({ '#age': 'age' });
    expect(result.values).toEqual({ ':age': 30 });
  });

  test('multiple conditions with AND', () => {
    const result = buildConditionExpression([
      { attribute: 'pk', operator: 'exists' },
      { attribute: 'age', operator: '=', value: 25 },
    ]);
    expect(result.expression).toBe('attribute_exists(#pk) AND #age = :age');
    expect(result.names).toEqual({
      '#pk': 'pk',
      '#age': 'age',
    });
    expect(result.values).toEqual({ ':age': 25 });
  });

  test('OR between conditions', () => {
    const result = buildConditionExpression([
      { attribute: 'pk', operator: 'exists' },
      { link: 'OR', attribute: 'sk', operator: 'not_exists' },
    ]);
    expect(result.expression).toBe(
      'attribute_exists(#pk) OR attribute_not_exists(#sk)',
    );
    expect(result.names).toEqual({
      '#pk': 'pk',
      '#sk': 'sk',
    });
    expect(result.values).toEqual({});
  });

  test('nested groups', () => {
    const result = buildConditionExpression([
      {
        conditions: [
          { attribute: 'pk', operator: 'exists' },
          { attribute: 'sk', operator: 'exists' },
        ],
      },
      {
        link: 'AND',
        conditions: [
          { attribute: 'age', operator: '=', value: 20 },
          { link: 'OR', attribute: 'name', operator: '=', value: 'Alice' },
        ],
      },
    ]);
    expect(result.expression).toBe(
      '(attribute_exists(#pk) AND attribute_exists(#sk)) AND (#age = :age OR #name = :name)',
    );
    expect(result.names).toEqual({
      '#pk': 'pk',
      '#sk': 'sk',
      '#age': 'age',
      '#name': 'name',
    });
    expect(result.values).toEqual({
      ':age': 20,
      ':name': 'Alice',
    });
  });

  test('comparison operators', () => {
    const ops = ['<', '<=', '>', '>=', '<>'] as const;
    const values = [1, 2, 3, 4, 5];
    ops.forEach((op, idx) => {
      const conditions = [
        { attribute: 'score', operator: op, value: values[idx] ?? 0 },
      ];
      const result = buildConditionExpression(conditions);
      expect(result.expression).toBe(`#score ${op} :score`);
      expect(result.names).toEqual({ '#score': 'score' });
      expect(result.values).toEqual({ ':score': values[idx] });
    });
  });

  describe('clean output', () => {
    test('empty input, expression should be undefined', () => {
      const result = buildConditionExpression({
        conditions: [],
      });

      expect(result.expression).toBeUndefined();
      expect(result.names).toEqual({});
      expect(result.values).toEqual({});
    });

    test('single condition in group', () => {
      const result = buildConditionExpression({
        conditions: [{ operator: '=', attribute: 'age', value: 25 }],
      });

      expect(result.expression).toBe('#age = :age');
      expect(result.names).toEqual({ '#age': 'age' });
      expect(result.values).toEqual({ ':age': 25 });
    });

    test('two conditions in group', () => {
      const result = buildConditionExpression({
        conditions: [
          { operator: '=', attribute: 'age', value: 25 },
          { operator: '=', attribute: 'name', value: 'foo' },
        ],
      });
      expect(result.expression).toBe('#age = :age AND #name = :name');
    });
  });

  describe('ignoreFirstLink', () => {
    test('false with no link value', () => {
      const result = buildConditionExpression(
        { attribute: 'pk', operator: 'exists' },
        { ignoreFirstLink: false },
      );
      expect(result.expression).toBe('attribute_exists(#pk)');
    });

    test('false with link value', () => {
      const result = buildConditionExpression(
        { attribute: 'pk', operator: 'exists', link: 'OR' },
        { ignoreFirstLink: false },
      );

      expect(result.expression).toBe('OR attribute_exists(#pk)');
    });
  });
});
