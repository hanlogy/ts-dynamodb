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
  readonly link?: LogicalOperator | undefined;
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
  readonly operator?: ComparisonOperator | undefined;
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

// Put
export type PutReturnValue = Extract<ReturnValue, 'ALL_OLD' | 'NONE'>;
export interface PutConfig<ItemT extends object = UnknownRecord> {
  readonly item: ItemT;
  readonly keyNames: Extract<keyof ItemT, string>[];
  readonly conditions?: MaybeConditions | undefined;
  readonly timestamp?: boolean | undefined;
  readonly preventOverwrite?: boolean | undefined;
  readonly returnValues?: PutReturnValue;
}

export interface PutInput<ItemT extends object = UnknownRecord> {
  readonly TableName: string;
  readonly Item: ItemT & {
    readonly createdAt?: string | undefined;
    readonly updatedAt?: string | undefined;
  };

  readonly ExpressionAttributeNames?: PlaceholderNames | undefined;
  readonly ExpressionAttributeValues?: PlaceholderValues | undefined;
  readonly ConditionExpression?: string | undefined;
  readonly returnValues?: PutReturnValue;
}

// Update
export interface UpdateConfig<
  SetAttributesT extends object = UnknownRecord,
  KeysT extends Keys = SingleTableKeys,
> {
  readonly keys: KeysT;
  readonly setAttributes?: SetAttributesT | undefined;
  readonly removeAttributes?: readonly string[] | undefined;
  readonly upsert?: boolean | undefined;
  readonly conditions?: MaybeConditions | undefined;
  readonly timestamp?: boolean | undefined;
  readonly returnValues?: ReturnValue | undefined;
}

export interface UpdateInput<K extends Keys = SingleTableKeys> {
  readonly TableName: string;
  readonly Key: K;
  readonly UpdateExpression: string;

  readonly ConditionExpression?: string | undefined;
  readonly ExpressionAttributeNames?: PlaceholderNames | undefined;
  readonly ExpressionAttributeValues?: PlaceholderValues | undefined;
  readonly ReturnValues?: ReturnValue | undefined;
}

// Query
export interface QueryConfig {
  readonly indexName?: string | undefined;
  readonly keyConditions?: MaybeConditions | undefined;
  readonly projections?: string[] | undefined;
  readonly limit?: number | undefined;
  readonly exclusiveStartKey?: AttributeValueRecord | undefined;
  readonly descending?: boolean | undefined;
}

export interface QueryInput {
  readonly TableName: string;
  readonly KeyConditionExpression: string | undefined;

  readonly ExpressionAttributeNames?: PlaceholderNames | undefined;
  readonly ExpressionAttributeValues?: PlaceholderValues | undefined;

  readonly Limit?: number | undefined;
  readonly IndexName?: string | undefined;
  readonly ProjectionExpression?: string | undefined;
  readonly ExclusiveStartKey?: AttributeValueRecord | undefined;
  readonly ScanIndexForward?: false | undefined;
}

//  Delete
export interface DeleteConfig<KeysT extends Keys = SingleTableKeys> {
  readonly keys: KeysT;
  readonly conditions?: MaybeConditions | undefined;
}

export interface DeleteInput<KeysT extends Keys = SingleTableKeys> {
  readonly TableName: string;
  readonly Key: KeysT;
  readonly ExpressionAttributeNames: PlaceholderNames;
  readonly ExpressionAttributeValues: PlaceholderValues;
  readonly ConditionExpression?: string | undefined;
}

// TransactWrite
export interface TransactWriteConfig<
  PutItemT extends object = UnknownRecord,
  SetAttributesT extends object = UnknownRecord,
  UpdateKeysT extends Keys = SingleTableKeys,
  DeleteKeysT extends Keys = SingleTableKeys,
> {
  readonly put?: PutConfig<PutItemT>[] | undefined;
  readonly update?: UpdateConfig<SetAttributesT, UpdateKeysT>[] | undefined;
  readonly delete?: DeleteConfig<DeleteKeysT>[] | undefined;
}

export interface BatchWriteConfig {
  readonly put?: UnknownRecord[] | undefined;
  readonly delete?: UnknownRecord[] | undefined;
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

export interface SetUpdateExpression {
  readonly expression: string;
  readonly names: PlaceholderNames;
  readonly values: PlaceholderValues;
}
