import { MDXRemote } from 'next-mdx-remote/rsc';

import { getBucketFileNames, readFileFromS3 } from '@/util/aws-s3';
import RedText from '@/components/RedText';

export async function generateStaticParams() {
  const params: { title: string }[] = [];
  (await getBucketFileNames()).map(e =>
    params.push({ title: e.split('.mdx')[0]! })
  );
  return params;
}

export default async function Page({ params }: { params: { title: string } }) {
  const { title } = params;
  const mdxSource = await readFileFromS3(`${title}.mdx`);
  return (
    <>
      <div className="prose lg:prose-xl prose-slate invert">
        <MDXRemote source={mdxSource} />
        ---
        <MDXRemote components={{ RedText }}
                   source={'# My Page\n\nThis is some text.\n\n<RedText>This text is red, but inverted.</RedText>'} />
      </div>
    </>
  );
}
