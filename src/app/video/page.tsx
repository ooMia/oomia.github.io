import VideoPlayer from '@/components/VideoPlayer';
import UploadPlayer from '@/components/UploadPlayer';

export default async function Page() {


  return <>
    <div className="">
      <h1>Stream</h1>


      {/* anonymous video player*/}
      <h3>1. Static Video</h3>
      <VideoPlayer src="https://www.w3schools.com/html/mov_bbb.mp4"
                   type="video/mp4"
      />

      {/* upload video form and play */}
      {/* when click upload, change into VideoPlayer that plays video*/}
      <h3>2. Dynamic Video</h3>
      <UploadPlayer />

    </div>
  </>;

}
