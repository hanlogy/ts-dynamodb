import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export function createClientFromEnv(): DynamoDBDocumentClient {
  const {
    DYNAMODB_ENDPOINT,
    DYNAMODB_REGION,
    DYNAMODB_ACCESS_KEY_ID,
    DYNAMODB_SECRET_ACCESS_KEY,
  } = process.env;

  const config: DynamoDBClientConfig = {};

  if (DYNAMODB_ENDPOINT) {
    config.endpoint = DYNAMODB_ENDPOINT;
  }
  if (DYNAMODB_REGION) {
    config.region = DYNAMODB_REGION;
  }

  if (DYNAMODB_ACCESS_KEY_ID && DYNAMODB_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: DYNAMODB_ACCESS_KEY_ID,
      secretAccessKey: DYNAMODB_SECRET_ACCESS_KEY,
    };
  } else if (DYNAMODB_ACCESS_KEY_ID || DYNAMODB_SECRET_ACCESS_KEY) {
    throw new Error(
      'Both AWS access key ID and secret access key must be provided',
    );
  }

  return DynamoDBDocumentClient.from(new DynamoDBClient(config));
}
