import {getBucketFileNames, readFileFromS3} from '@/util/aws-s3';

export async function generateStaticParams() {
  const params: {title: string}[] = [];
  (await getBucketFileNames()).map(e =>
    params.push({title: e.split('.mdx')[0]!})
  );
  return params;
}

export default async function Page({params}: {params: {title: string}}) {
  const {title} = params;
  console.log(title);
  return (
    <>
      <h1>{title}</h1>
      <div>{await readFileFromS3(`${title}.mdx`)}</div>
    </>
  );
}
