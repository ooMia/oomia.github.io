export default async function Page() {
  return <div className={''}>

    {
      /**
       * list of endpoints
       * - blogs
       * - video
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
