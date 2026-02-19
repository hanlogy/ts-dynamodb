import { ReturnValue } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommandInput,
  NativeAttributeValue,
} from '@aws-sdk/lib-dynamodb';

export type StringKeyRecord<T> = Record<string, T>;
export type UnknownRecord = StringKeyRecord<unknown>;
export type PlaceholderNames = Record<`#${string}`, string>;
export type PlaceholderValues = Record<`:${string}`, NativeAttributeValue>;
export type AttributeValue = NativeAttributeValue;
export type AttributeValueRecord = StringKeyRecord<NativeAttributeValue>;
export type Keys = StringKeyRecord<string | number>;
export type SingleTableKeys = Record<'pk' | 'sk', string>;

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

export interface PutConfig<T extends object = UnknownRecord> {
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
  readonly exclusiveStartKey?: AttributeValueRecord;
  readonly descending?: boolean;
}

export interface TransactWriteConfig<
  PT extends object = UnknownRecord,
  UT extends object = UnknownRecord,
  UK extends Keys = SingleTableKeys,
  DK extends Keys = SingleTableKeys,
> {
  readonly put?: PutConfig<PT>[];
  readonly update?: UpdateConfig<UT, UK>[];
  readonly delete?: DeleteConfig<DK>[];
}

export interface BatchWriteConfig {
  readonly put?: UnknownRecord[];
  readonly delete?: UnknownRecord[];
}

export interface UpdateConfig<
  T extends object = UnknownRecord,
  K extends Keys = SingleTableKeys,
> {
  readonly keys: K;
  readonly setAttributes?: T;
  readonly removeAttributes?: readonly string[];
  readonly upsert?: boolean;
  readonly conditions?: MaybeConditions;
  readonly timestamp?: boolean;
  readonly returnValues?: ReturnValue;
}

export type BatchWriteInput = Omit<BatchWriteCommandInput, 'RequestItems'> & {
  RequestItems: StringKeyRecord<
    (
      | { PutRequest: { Item: StringKeyRecord<NativeAttributeValue> } }
      | { DeleteRequest: { Key: StringKeyRecord<NativeAttributeValue> } }
    )[]
  >;
};

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
  readonly ExclusiveStartKey?: AttributeValueRecord;
  readonly ScanIndexForward?: false;
}

export interface PutInput<T extends object = UnknownRecord> {
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
  readonly ReturnValues?: ReturnValue;
}
