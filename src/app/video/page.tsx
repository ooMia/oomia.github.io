export default async function Page() {


  return <>
    <div className="prose lg:prose-xl prose-slate">
      <h1>Stream</h1>


      {/* anonymous video player*/}
      <h3>random video</h3>
      <video controls className="invert w-full py-4">
        <source
          src="https://www.w3schools.com/html/mov_bbb.mp4"
          type="video/mp4"

        />
        Your browser does not support the video tag.
      </video>


    </div>
  </>;

}
