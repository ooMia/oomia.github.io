export default async function Page() {
  return <div className={'prose prose-red prose-2xl'}>

    {
      /**
       * list of endpoints
       * - blogs
       */
    }

    <h1>Endpoints</h1>
    <ul>
      <li>
        <a href={'/blogs'}>/blogs</a>
      </li>
      <li>
        <a href={'/video'}>/video</a>
      </li>
    </ul>


  </div>;
}
