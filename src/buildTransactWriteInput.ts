import { type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { buildPutInput } from './buildPutInput';
import { buildUpdateInput } from './buildUpdateInput';
import { buildDeleteInput } from './buildDeleteInput';
import type {
  Keys,
  SingleTableKeys,
  TransactWriteConfig,
  UnknownRecord,
} from './types';

export function buildTransactWriteInput<
  PutItemT extends object = UnknownRecord,
  SetAttributesT extends object = UnknownRecord,
  UpdateKeysT extends Keys = SingleTableKeys,
  DeleteKeysT extends Keys = SingleTableKeys,
>({
  tableName,
  put: putItems = [],
  update: updateItems = [],
  delete: deleteItems = [],
}: TransactWriteConfig<PutItemT, SetAttributesT, UpdateKeysT, DeleteKeysT> & {
  tableName: string;
}): TransactWriteCommandInput {
  return {
    TransactItems: [
      ...putItems.map((e) => ({
        Put: buildPutInput<PutItemT>({ tableName, ...e }),
      })),
      ...updateItems.map((e) => ({
        Update: buildUpdateInput<SetAttributesT, UpdateKeysT>({
          tableName,
          ...e,
        }),
      })),
      ...deleteItems.map((e) => ({
        Delete: buildDeleteInput<DeleteKeysT>({ tableName, ...e }),
      })),
    ],
  };
}
