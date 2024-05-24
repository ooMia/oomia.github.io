import { VideoFile } from '@/type/Video';

export default async function VideoPlayer(video: VideoFile) {
  return <video controls className="w-full py-4">
    <source
      src={video.src}
      type={video.type}
    />
    Your browser does not support the video tag.
  </video>;
}


