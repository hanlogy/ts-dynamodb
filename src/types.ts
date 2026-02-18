import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';

export type TypedRecord<T> = Record<string, T>;
export type AnyRecord = TypedRecord<any>;

export type PlaceholderNames = Record<`#${string}`, string>;
export type PlaceholderValues = Record<`:${string}`, NativeAttributeValue>;
export type AttributeValues = AnyRecord;
export type ExclusiveStartKey = AnyRecord;
export type Keys = TypedRecord<string | number>;
export type SingleTableKeys = { pk: string; sk: string };

// Types for condition
type LogicalOperator = 'AND' | 'OR';
type ExistsOperator = 'exists' | 'not_exists';
type BeginsWith = 'begins_with';
type ComparisonOperator = '=' | '<>' | '<' | '<=' | '>' | '>=';

interface BaseCondition {
  /** How this condition links to the previous one */
  readonly link?: LogicalOperator;
}

interface ExistsCondition extends BaseCondition {
  readonly attribute: string;
  readonly operator: ExistsOperator;
}

interface BeginsWithCondition extends BaseCondition {
  readonly attribute: string;
  readonly operator: BeginsWith;
  readonly value: string;
}

interface ComparisonCondition extends BaseCondition {
  readonly attribute: string;
  readonly operator?: ComparisonOperator;
  readonly value: string | number | boolean;
}

interface GroupCondition extends BaseCondition {
  readonly conditions: Condition[];
}

export type Condition =
  | ExistsCondition
  | BeginsWithCondition
  | ComparisonCondition
  | GroupCondition;
export type MaybeConditions = Condition | Condition[] | null;

export interface DeleteConfig<K extends Keys = SingleTableKeys> {
  readonly keys: K;
  readonly conditions?: MaybeConditions;
}

export interface PutConfig<T extends AnyRecord = AnyRecord> {
  readonly attributes: T;
  readonly keyNames: Extract<keyof T, string>[];
  readonly conditions?: MaybeConditions;
  readonly timestamp?: boolean;
  readonly preventOverwrite?: boolean;
}

export interface QueryConfig {
  readonly indexName?: string;
  readonly keyConditions?: MaybeConditions;
  readonly projections?: string[];
  readonly limit?: number;
  readonly exclusiveStartKey?: ExclusiveStartKey;
  readonly descending?: boolean;
}

export interface TransactWriteConfig<
  PT extends AnyRecord = AnyRecord,
  UT extends AnyRecord = AnyRecord,
  UK extends Keys = SingleTableKeys,
  DK extends Keys = SingleTableKeys,
> {
  readonly put?: PutConfig<PT>[];
  readonly update?: UpdateConfig<UT, UK>[];
  readonly delete?: DeleteConfig<DK>[];
}

export interface BatchWriteConfig {
  readonly put?: AnyRecord[];
  readonly delete?: AnyRecord[];
}

export interface UpdateConfig<
  T extends AnyRecord = AnyRecord,
  K extends Keys = SingleTableKeys,
> {
  readonly keys: K;
  readonly setAttributes?: T;
  readonly removeAttributes?: readonly string[];
  readonly upsert?: boolean;
  readonly conditions?: MaybeConditions;
  readonly timestamp?: boolean;
}

export interface BatchWriteInput {
  readonly RequestItems: TypedRecord<
    (
      | { PutRequest: { Item: AnyRecord } }
      | { DeleteRequest: { Key: AnyRecord } }
    )[]
  >;
}

export interface ParsedCondition {
  readonly expression?: string | undefined;
  readonly names: PlaceholderNames;
  readonly values: PlaceholderValues;
}

export interface DeleteInput<K extends Keys = SingleTableKeys> {
  readonly TableName: string;
  readonly Key: K;
  readonly ExpressionAttributeNames: PlaceholderNames;
  readonly ExpressionAttributeValues: PlaceholderValues;
  readonly ConditionExpression?: string | undefined;
}

export interface QueryInput {
  readonly TableName: string;
  readonly KeyConditionExpression: string | undefined;

  readonly ExpressionAttributeNames?: PlaceholderNames;
  readonly ExpressionAttributeValues?: PlaceholderValues;

  readonly Limit?: number;
  readonly IndexName?: string;
  readonly ProjectionExpression?: string;
  readonly ExclusiveStartKey?: ExclusiveStartKey;
  readonly ScanIndexForward?: false;
}

export interface PutInput<T extends object = AnyRecord> {
  readonly TableName: string;
  readonly Item: T & {
    readonly createdAt?: string;
    readonly updatedAt?: string;
  };

  readonly ExpressionAttributeNames?: PlaceholderNames;
  readonly ExpressionAttributeValues?: PlaceholderValues;
  readonly ConditionExpression?: string;
}

export interface SetUpdateExpression {
  readonly expression: string;
  readonly names: PlaceholderNames;
  readonly values: PlaceholderValues;
}

export interface UpdateInput<K extends Keys = SingleTableKeys> {
  readonly TableName: string;
  readonly Key: K;
  readonly UpdateExpression: string;

  readonly ConditionExpression?: string;
  readonly ExpressionAttributeNames?: PlaceholderNames;
  readonly ExpressionAttributeValues?: PlaceholderValues;
}
