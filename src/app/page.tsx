export default async function Page() {
  return (<div className={'prose prose-red prose-2xl'}>
    <ul>
      <li>
        <a href={'/blogs/index'}>blogs</a> :remote file (AWS S3)
      </li>
      <li>
        <a href={'/mdx'}>mdx</a> :static file (local)
      </li>
    </ul>
  </div>);
}
