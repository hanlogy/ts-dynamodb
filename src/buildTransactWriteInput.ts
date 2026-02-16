import { type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { buildPutInput } from './buildPutInput';
import { buildUpdateInput } from './buildUpdateInput';
import { buildDeleteInput } from './buildDeleteInput';
import type {
  AnyRecord,
  Keys,
  SingleTableKeys,
  TransactWriteConfig,
} from './types';

export function buildTransactWriteInput<
  PT extends AnyRecord = AnyRecord,
  UT extends AnyRecord = AnyRecord,
  UK extends Keys = SingleTableKeys,
  DK extends Keys = SingleTableKeys,
>({
  tableName,
  put: putItems = [],
  update: updateItems = [],
  delete: deleteItems = [],
}: TransactWriteConfig<PT, UT, UK, DK> & {
  tableName: string;
}): TransactWriteCommandInput {
  return {
    TransactItems: [
      ...putItems.map((e) => ({
        Put: buildPutInput<PT>({ tableName, ...e }),
      })),
      ...updateItems.map((e) => ({
        Update: buildUpdateInput<UT, UK>({ tableName, ...e }),
      })),
      ...deleteItems.map((e) => ({
        Delete: buildDeleteInput<DK>({ tableName, ...e }),
      })),
    ],
  };
}
