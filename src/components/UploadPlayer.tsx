'use client';

import { ChangeEvent, useRef } from 'react';

const UploadPlayer = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (file && videoRef.current) {
      videoRef.current.src = URL.createObjectURL(file);
    }
  };

  return (
    <div className="flex flex-col">
      <input id="file" type="file" accept="video/*" onChange={handleUpload} />
      <video ref={videoRef} controls className="w-full py-4" />
    </div>
  );
};

export default UploadPlayer;
