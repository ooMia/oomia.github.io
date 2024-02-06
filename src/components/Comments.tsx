import React from "react";
import Script from "next/script";

export default async function Comments() {
  return (
    <div>
      {/*https://nextjs.org/docs/app/building-your-application/optimizing/scripts*/}
      <Script
        src={"https://giscus.app/client.js"}
        data-repo="ooMia/giscus-comments"
        data-repo-id="R_kgDOLFhy6A"
        data-category="Announcements"
        data-category-id="DIC_kwDOLFhy6M4CcdO2"
        data-mapping="pathname"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="1"
        data-input-position="top"
        data-theme="dark_high_contrast"
        data-lang="ko"
        data-loading="lazy"
        crossOrigin="anonymous"
        async
        // https://nextjs.org/docs/app/api-reference/components/script#strategy
        strategy="afterInteractive"
      />
    </div>
  );
}
