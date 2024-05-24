// blog post page

import { MDXRemote } from 'next-mdx-remote/rsc';

import { convertSystemToHumanDate, getLocalMDXContent, getLocalMDXMetaInfo, getLocalMDXTitles } from '@/util/local-mdx';
import RedText from '@/components/RedText';

export function generateStaticParams() {
  const params: { title: string }[] = [];
  getLocalMDXTitles().map(title => {
    params.push({
      title: title
    });
  });
  return params;
}

export default function Page({ params }: { params: { title: string } }) {

  const [content, meta] = [getLocalMDXContent(params.title), getLocalMDXMetaInfo(params.title)];


  return (
    <>
      <div className="lg:prose-xl">
        <div>
          <p>Created: {convertSystemToHumanDate(meta.birthtimeMs)}</p>
          <p>Modified: {convertSystemToHumanDate(meta.mtimeMs)}</p>
        </div>

        <MDXRemote source={content} />

        <MDXRemote components={{ RedText }}
                   source={'# My Page\n\nThis is some text.\n\n<RedText>This text is red, but inverted.</RedText>'} />
      </div>
    </>
  );
}
