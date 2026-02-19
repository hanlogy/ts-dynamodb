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
  type PutCommandOutput,
  type DeleteCommandOutput,
  type TransactWriteCommandOutput,
  GetCommandOutput,
  UpdateCommandOutput,
  QueryCommandOutput,
  BatchGetCommandOutput,
  BatchWriteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import {
  ScanCommandOutput,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import { createClientFromEnv } from './createClientFromEnv';
import { buildUpdateInput } from './buildUpdateInput';
import { buildQueryInput } from './buildQueryInput';
import { buildPutInput } from './buildPutInput';
import { buildDeleteInput } from './buildDeleteInput';
import { buildTransactWriteInput } from './buildTransactWriteInput';
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
import { buildBatchWriteInput } from './buildBatchWriteInput';

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

  async scan(): Promise<ScanCommandOutput> {
    return await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    );
  }

  async get({
    keys,
  }: {
    keys: AttributeValueRecord;
  }): Promise<GetCommandOutput> {
    return await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: keys }),
    );
  }

  async update<
    T extends object = UnknownRecord,
    K extends Keys = SingleTableKeys,
  >(config: UpdateConfig<T, K>): Promise<UpdateCommandOutput> {
    const commandInput = buildUpdateInput<T, K>({
      tableName: this.tableName,
      ...config,
    });

    return await this.client.send(new UpdateCommand(commandInput));
  }

  async query(config: QueryConfig): Promise<QueryCommandOutput> {
    const commandInput = buildQueryInput({
      tableName: this.tableName,
      ...config,
    });

    return await this.client.send(new QueryCommand(commandInput));
  }

  async create<T extends object = UnknownRecord>(
    config: PutConfig<T>,
  ): Promise<PutCommandOutput> {
    return await this.client.send(
      new PutCommand(
        // TODO: Never call these helpers in the method, always use it outisde, we need to decuple these!!!
        buildPutInput<T>({ tableName: this.tableName, ...config }),
      ),
    );
  }

  async delete<K extends Keys = SingleTableKeys>(
    config: DeleteConfig<K>,
  ): Promise<DeleteCommandOutput> {
    return await this.client.send(
      new DeleteCommand(
        buildDeleteInput<K>({ tableName: this.tableName, ...config }),
      ),
    );
  }

  async transactWrite<
    PT extends object = UnknownRecord,
    UT extends object = UnknownRecord,
    UK extends Keys = SingleTableKeys,
    DK extends Keys = SingleTableKeys,
  >(
    config: TransactWriteConfig<PT, UT, UK, DK>,
  ): Promise<TransactWriteCommandOutput> {
    try {
      return await this.client.send(
        new TransactWriteCommand(
          buildTransactWriteInput<PT, UT, UK, DK>({
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
  async batchGet({
    keys,
  }: {
    keys: readonly Keys[];
  }): Promise<BatchGetCommandOutput> {
    return await this.client.send(
      new BatchGetCommand({
        RequestItems: { [this.tableName]: { Keys: [...keys] } },
      }),
    );
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
