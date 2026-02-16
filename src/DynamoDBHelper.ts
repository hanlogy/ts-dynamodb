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
} from '@aws-sdk/lib-dynamodb';
import {
  TransactionCanceledException,
  type ReturnValue,
} from '@aws-sdk/client-dynamodb';
import { createClientFromEnv } from './createClientFromEnv';
import { buildUpdateInput } from './buildUpdateInput';
import { buildQueryInput } from './buildQueryInput';
import { buildPutInput } from './buildPutInput';
import { buildDeleteInput } from './buildDeleteInput';
import { buildTransactWriteInput } from './buildTransactWriteInput';
import type {
  AnyRecord,
  BatchWriteConfig,
  DeleteConfig,
  Keys,
  PutConfig,
  QueryConfig,
  SingleTableKeys,
  TransactWriteConfig,
  UpdateConfig,
  BatchWriteInput,
} from './types';
import { buildBatchWriteInput } from './buildBatchWriteInput';

export interface DynamoDBHelperProps {
  readonly client?: DynamoDBDocumentClient;
  tableName?: string;
}

export class DynamoDBHelper {
  constructor({ client, tableName }: DynamoDBHelperProps = {}) {
    const resolvedTableName = tableName ?? process.env['DYNAMODB_TABLE_NAME'];
    if (!resolvedTableName) {
      throw new Error('tableName is missing');
    }
    this.tableName = resolvedTableName;
    this.client = client ?? createClientFromEnv();
  }

  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  emptyKey = 'META';

  async scan(): Promise<Readonly<{ items: readonly AnyRecord[] }>> {
    const { Items: items } = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    );
    return { items: items ?? [] };
  }

  async get<T extends AnyRecord = AnyRecord, K extends Keys = SingleTableKeys>({
    keys,
  }: {
    keys: K;
  }): Promise<Readonly<{ item: Readonly<T> | undefined }>> {
    const { Item: item } = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: keys }),
    );

    return { item: item ? (item as T) : undefined };
  }

  update<
    R extends AnyRecord = AnyRecord,
    T extends AnyRecord = AnyRecord,
    K extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<T, K> & { returnValues: FullReturnValue },
  ): Promise<Readonly<{ attributes: R }>>;

  update<
    R extends AnyRecord = AnyRecord,
    T extends AnyRecord = AnyRecord,
    K extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<T, K> & { returnValues?: PartialReturnValue },
  ): Promise<Readonly<{ attributes: Partial<R> }>>;

  async update<
    R extends AnyRecord = AnyRecord,
    T extends AnyRecord = AnyRecord,
    K extends Keys = SingleTableKeys,
  >(
    config: UpdateConfig<T, K> & {
      returnValues?: ReturnValue;
    },
  ): Promise<Readonly<{ attributes: Partial<R> }>> {
    const commandInput = buildUpdateInput<T, K>({
      tableName: this.tableName,
      ...config,
    });

    if (config.returnValues) {
      Object.assign(commandInput, {
        ReturnValues: config.returnValues,
      });
    }
    const { Attributes = {} } = await this.client.send(
      new UpdateCommand(commandInput),
    );

    return {
      attributes: Attributes as Partial<R>,
    };
  }

  async query<T extends AnyRecord = AnyRecord>(
    config: QueryConfig,
  ): Promise<
    Readonly<{
      items: readonly T[];
      lastEvaluatedKey?: AnyRecord;
    }>
  > {
    const commandInput = buildQueryInput({
      tableName: this.tableName,
      ...config,
    });

    const { Items: items = [], LastEvaluatedKey: lastEvaluatedKey } =
      await this.client.send(new QueryCommand(commandInput));

    return { items: items as T[], lastEvaluatedKey };
  }

  async create<T extends AnyRecord = AnyRecord>(
    config: PutConfig<T>,
  ): Promise<PutCommandOutput> {
    return this.client.send(
      new PutCommand(
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
    PT extends AnyRecord = AnyRecord,
    UT extends AnyRecord = AnyRecord,
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
  async batchGet<T, K extends Keys = SingleTableKeys>({
    keys,
  }: {
    keys: readonly K[];
  }): Promise<{ items: readonly T[] }> {
    const data = await this.client.send(
      new BatchGetCommand({
        RequestItems: { [this.tableName]: { Keys: [...keys] } },
      }),
    );

    const items = data.Responses?.[this.tableName] ?? [];

    return { items: items as readonly T[] };
  }

  async batchWrite(
    config: BatchWriteConfig,
  ): Promise<BatchWriteInput['RequestItems']> {
    const MAX_RETRIES = 5;
    let retries = 0;

    let unprocessed: Record<string, any[]> = buildBatchWriteInput({
      tableName: this.tableName,
      ...config,
    }).RequestItems;

    while (Object.keys(unprocessed).length > 0 && retries < MAX_RETRIES) {
      const response = await this.client.send(
        new BatchWriteCommand({ RequestItems: unprocessed }),
      );
      unprocessed = response.UnprocessedItems || {};
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

  normalizeDate(input: string): string;
  normalizeDate(input?: string): string | undefined;
  normalizeDate(input?: string): string | undefined {
    return input ? new Date(input).toISOString() : undefined;
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

type FullReturnValue = 'ALL_NEW' | 'ALL_OLD';
type PartialReturnValue = Exclude<ReturnValue, FullReturnValue>;
