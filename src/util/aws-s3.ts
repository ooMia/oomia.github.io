import {
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {NodeJsClient} from '@smithy/types';

// When no region or credentials are provided, the SDK will use the
// region and credentials from the local AWS config.
const client = new S3Client({
  region: 'ap-northeast-2',
  maxAttempts: 1,
}) as NodeJsClient<S3Client>;

const myBucketName = 'github-io';

export const getBuckets = async () => {
  const command = new ListBucketsCommand({});
  const {Buckets} = await client.send(command);
  return Buckets;
};

export const getBucketFileNames = async (): Promise<string[]> => {
  const command = new ListObjectsCommand({Bucket: myBucketName});

  const fileNames: string[] = [];
  const {Contents} = await client.send(command);
  console.log('Files: ');
  console.log(Contents?.map(file => file.Key).join('\n'));
  Contents?.map(file => fileNames.push(file.Key!));
  Contents?.map(file => readFileFromS3(file.Key));
  return fileNames;
};

export const readFileFromS3 = async (fileName?: string): Promise<string> => {
  const command = new GetObjectCommand({Bucket: myBucketName, Key: fileName});

  const {Body} = await client.send(command);

  let res = '';

  if (Body) {
    res = await new Promise((resolve, reject) => {
      let data = '';
      Body.on('data', (chunk: string) => (data += chunk));
      Body.on('end', () => resolve(data));
      Body.on('error', reject);
    });
  }
  return res;
};
