import { getBucketFileNames } from '@/util/aws-s3';

export default async function Page() {
  const files = await getBucketFileNames();
  const titles = files.map(e => e.split('.mdx')[0]!);

  return <>
    {titles.map(title => <a href={`/blogs/${titles}`} key={title}>{title}</a>)}
  </>;
}
