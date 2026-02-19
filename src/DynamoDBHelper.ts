import {
  ReturnValue,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  TransactWriteCommand,
  BatchWriteCommand,
  BatchGetCommand,
  ScanCommand,
  BatchWriteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { buildBatchWriteInput } from './buildBatchWriteInput';
import { buildDeleteInput } from './buildDeleteInput';
import { buildPutInput } from './buildPutInput';
import { buildQueryInput } from './buildQueryInput';
import { buildTransactWriteInput } from './buildTransactWriteInput';
import { buildUpdateInput } from './buildUpdateInput';
import { createClientFromEnv } from './createClientFromEnv';
import type {
  BatchWriteConfig,
  DeleteConfig,
  Keys,
  PutConfig,
  QueryConfig,
  SingleTableKeys,
  TransactWriteConfig,
  UpdateConfig,
  BatchWriteInput,
  UnknownRecord,
  AttributeValueRecord,
} from './types';

export interface DynamoDBHelperProps {
  readonly client?: DynamoDBDocumentClient;
  tableName?: string;
}

export class DynamoDBHelper {
  constructor({ client, tableName }: DynamoDBHelperProps = {}) {
    const resolvedTableName = tableName ?? process.env.DYNAMODB_TABLE_NAME;
    if (!resolvedTableName) {
      throw new Error('tableName is missing');
    }
    this.tableName = resolvedTableName;
    this.client = client ?? createClientFromEnv();
  }

  readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  emptyKey = 'META';

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/ScanCommand/
  async scan(): Promise<{ items: AttributeValueRecord[] }> {
    const { Items: items = [] } = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    );

    return { items };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/GetCommand/
  async get({ keys }: { keys: AttributeValueRecord }): Promise<{
    item: AttributeValueRecord | undefined;
  }> {
    const { Item: item } = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: keys }),
    );

    return { item };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/command/QueryCommand/
  async query(config: QueryConfig): Promise<{
    items: AttributeValueRecord[];
    lastEvaluatedKey: AttributeValueRecord | undefined;
  }> {
    const commandInput = buildQueryInput({
      tableName: this.tableName,
      ...config,
    });

    const { Items: items = [], LastEvaluatedKey: lastEvaluatedKey } =
      await this.client.send(new QueryCommand(commandInput));

    return { items, lastEvaluatedKey };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/PutCommand/
  put<ItemT extends object = UnknownRecord>(
    config: PutConfig<ItemT> & { returnValues: 'ALL_OLD' },
  ): Promise<Readonly<{ attributes: AttributeValueRecord }>>;

  put<ItemT extends object = UnknownRecord>(
    config: PutConfig<ItemT> & { returnValues?: 'NONE' | undefined },
  ): Promise<Readonly<{ attributes: undefined }>>;

  async put<ItemT extends object = UnknownRecord>(
    config: PutConfig<ItemT>,
  ): Promise<{
    attributes: AttributeValueRecord | undefined;
  }> {
    const { Attributes: attributes } = await this.client.send(
      new PutCommand(
        buildPutInput<ItemT>({ tableName: this.tableName, ...config }),
      ),
    );

    return { attributes };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/UpdateCommand/
  update<
    SetAttributesT extends object = UnknownRecord,
    KeysT extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<SetAttributesT, KeysT> & {
      returnValues: Exclude<ReturnValue, 'NONE'>;
    },
  ): Promise<Readonly<{ attributes: AttributeValueRecord }>>;

  update<
    SetAttributesT extends object = UnknownRecord,
    KeysT extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<SetAttributesT, KeysT> & {
      returnValues?: 'NONE' | undefined;
    },
  ): Promise<Readonly<{ attributes: undefined }>>;

  async update<
    SetAttributesT extends object = UnknownRecord,
    KeysT extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<SetAttributesT, KeysT>,
  ): Promise<{
    attributes: AttributeValueRecord | undefined;
  }> {
    const commandInput = buildUpdateInput<SetAttributesT, KeysT>({
      tableName: this.tableName,
      ...config,
    });

    const { Attributes: attributes } = await this.client.send(
      new UpdateCommand(commandInput),
    );

    return { attributes };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/DeleteCommand/
  async delete<KeysT extends Keys = SingleTableKeys>(
    config: DeleteConfig<KeysT>,
  ): Promise<void> {
    await this.client.send(
      new DeleteCommand(
        buildDeleteInput<KeysT>({ tableName: this.tableName, ...config }),
      ),
    );
  }

  async transactWrite<
    PutItemT extends object = UnknownRecord,
    SetAttributesT extends object = UnknownRecord,
    UpdateKeysT extends Keys = SingleTableKeys,
    DeleteKeysT extends Keys = SingleTableKeys,
  >(
    config: TransactWriteConfig<
      PutItemT,
      SetAttributesT,
      UpdateKeysT,
      DeleteKeysT
    >,
  ): Promise<void> {
    try {
      await this.client.send(
        new TransactWriteCommand(
          buildTransactWriteInput<
            PutItemT,
            SetAttributesT,
            UpdateKeysT,
            DeleteKeysT
          >({
            tableName: this.tableName,
            ...config,
          }),
        ),
      );
    } catch (e: unknown) {
      if (e instanceof TransactionCanceledException) {
        // Do not return `ResponseError` here. This is to help the developer
        // understand what happened and implement additional feature handling.
        const reasons = e.CancellationReasons?.map((e) => e.Message);
        throw new Error(`${e.name}: ${reasons?.join()}`);
      } else {
        throw e;
      }
    }
  }

  /**
   * Support single table only
   */
  async batchGet({
    keys,
  }: {
    keys: AttributeValueRecord[];
  }): Promise<{ items: AttributeValueRecord[] }> {
    const data = await this.client.send(
      new BatchGetCommand({
        RequestItems: { [this.tableName]: { Keys: [...keys] } },
      }),
    );
    const items = data.Responses?.[this.tableName] ?? [];

    return { items: items };
  }

  async batchWrite(
    config: BatchWriteConfig,
  ): Promise<BatchWriteInput['RequestItems']> {
    const MAX_RETRIES = 5;
    let retries = 0;

    let unprocessed = buildBatchWriteInput({
      tableName: this.tableName,
      ...config,
    }).RequestItems;

    while (Object.keys(unprocessed).length > 0 && retries < MAX_RETRIES) {
      const response = await this.client.send(
        new BatchWriteCommand({ RequestItems: unprocessed }),
      );
      unprocessed = this.normalizeUnprocessedItems(response.UnprocessedItems);

      retries++;
      if (Object.keys(unprocessed).length > 0) {
        // Small delay between retries to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 100 * retries));
      }
    }

    if (Object.keys(unprocessed).length > 0) {
      console.warn(
        `Batch write still has unprocessed items after ${MAX_RETRIES} retries`,
        unprocessed,
      );
    }

    return unprocessed;
  }

  normalizeUnprocessedItems(
    input: BatchWriteCommandOutput['UnprocessedItems'],
  ): BatchWriteInput['RequestItems'] {
    const result: BatchWriteInput['RequestItems'] = {};

    if (!input) {
      return result;
    }

    for (const [tableName, requests] of Object.entries(input)) {
      if (requests.length === 0) {
        continue;
      }

      const normalized: BatchWriteInput['RequestItems'][string] = [];

      for (const req of requests) {
        if (req.PutRequest?.Item) {
          normalized.push({ PutRequest: { Item: req.PutRequest.Item } });
          continue;
        }

        if (req.DeleteRequest?.Key) {
          normalized.push({ DeleteRequest: { Key: req.DeleteRequest.Key } });
        }
      }

      if (normalized.length > 0) {
        result[tableName] = normalized;
      }
    }

    return result;
  }

  buildKey(...args: (string | number)[]): string;
  buildKey(...args: [...(string | number)[], boolean]): string;
  buildKey(...args: (string | number | boolean)[]): string {
    const last = args[args.length - 1];
    const hasBool = typeof last === 'boolean';
    const shouldHashEnd = hasBool ? last : false;
    const items = hasBool ? args.slice(0, -1) : args;
    const key = (items as (string | number)[])
      .map((e) =>
        String(e)
          .replace(/-/g, '')
          .replace(/ /g, '')
          .replace(/#+$/, '')
          .toLowerCase(),
      )
      .join('#');

    return shouldHashEnd ? key + '#' : key;
  }

  shard(prefix: `${string}#`, numShards: number): string {
    const shard = Math.floor(Math.random() * numShards);
    return `${prefix}${shard}`;
  }
}
