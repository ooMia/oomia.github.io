// blog list page

// import { getBucketFileNames } from '@/util/aws-s3';
import { getLocalMDXTitles } from '@/util/local-mdx';

// read list of mdx files in /resource/mdx
// export async function generateStaticParams() {
//   return getLocalMDXTitles();
// }

export default async function Page() {
  // const files = await getBucketFileNames();
  const files = getLocalMDXTitles();
  // const titles = files.map(e => e.split('.mdx')[0]!);

  return <>
    <div className="">
      <h1>Blog Posts</h1>
      <ul>
        {files.map((e, i) => (
          <li key={i}>
            <a href={`/blogs/${e}`}>{e}</a>
          </li>
        ))}
      </ul>
    </div>
  </>;
}
