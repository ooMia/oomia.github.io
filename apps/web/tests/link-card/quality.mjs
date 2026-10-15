import { chromium } from "@playwright/test";
import { preview } from "astro";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../../test-results/article-quality/", import.meta.url));
const server = await preview({root: fileURLToPath(new URL("./astro/", import.meta.url)), server:{host:"127.0.0.1",port:4323},logLevel:"error"});
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL});
const observations = [];
const dimensions = {landscape:[1200,630],portrait:[630,1200],"text-heavy":[1000,1000]};
try {
  await mkdir(output,{recursive:true});
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>{
    const url = new URL(route.request().url());
    if(url.hostname==="127.0.0.1") return route.continue();
    const kind = url.pathname.slice(1).replace(/\.svg$/,"");
    if(url.hostname==="images.example.com" && dimensions[kind]) {
      const [w,h] = dimensions[kind];
      return route.fulfill({contentType:"image/svg+xml",body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#d9e5df"/><rect x="12" y="12" width="${w-24}" height="${h-24}" fill="none" stroke="#366351" stroke-width="18"/><text x="40" y="80" font-family="sans-serif" font-size="40" fill="#203f31">TOP · ${kind}</text><text x="40" y="${h-48}" font-family="sans-serif" font-size="40" fill="#203f31">BOTTOM · preserved</text><path d="M30 ${h/2} H${w-30}" stroke="#769787" stroke-width="12"/></svg>`});
    }
    return route.abort();
  });
  await page.goto("http://127.0.0.1:4323/quality/");
  await page.waitForFunction(()=>!document.querySelector("astro-island[ssr]"));
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    for(const theme of ["light","dark"]) {
      const dark = await page.locator("html").evaluate(el=>el.classList.contains("dark"));
      if(dark!==(theme==="dark")) await page.getByRole("button",{name:"Toggle Theme"}).click();
      await page.waitForFunction(theme=>document.documentElement.classList.contains("dark")===(theme==="dark"),theme);
      assert.equal(await page.locator("html").evaluate(el=>el.classList.contains("dark")),theme==="dark");
      for(const alternative of ["cover","intrinsic","contain"]) {
        await page.locator(".link-card__image").evaluateAll((images,alternative)=>images.forEach(image=>{
          image.style.aspectRatio=alternative==="cover"?"16 / 9":"auto";
          image.style.objectFit=alternative==="cover"?"cover":"contain";
          image.style.maxHeight=alternative==="intrinsic"?"none":"14rem";
        }),alternative);
        const images = await page.locator(".link-card__image").evaluateAll(images=>images.map(image=>{
          const rect=image.getBoundingClientRect(),css=getComputedStyle(image);
          return {kind:image.closest("[data-image-case]").dataset.imageCase,width:rect.width,height:rect.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,objectFit:css.objectFit,cardHeight:image.closest(".link-card").getBoundingClientRect().height};
        }));
        if(alternative==="contain") for(const image of images) {
          assert.ok(image.naturalWidth>0);
          assert.equal(image.objectFit,"contain");
          assert.ok(image.height<=224.5);
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        observations.push({width,theme,alternative,images});
        if([320,1440].includes(width)) await page.locator('[data-image-case="portrait"]').screenshot({path:`${output}/${width}-${theme}-${alternative}.png`});
      }
      await page.locator(".link-card__image").evaluateAll(images=>images.forEach(image=>image.removeAttribute("style")));
      const paragraph = page.locator("[data-inline-sample]");
      for(const alternative of ["justify","inline-block","start"]) {
        await paragraph.evaluate((p,alternative)=>{
          p.style.textAlign=alternative==="start"?"start":"justify";
          const code=p.querySelector("code");
          Object.assign(code.style,alternative==="inline-block"?{display:"inline-block",maxWidth:"100%",whiteSpace:"normal",textAlign:"start"}:{display:"inline",maxWidth:"",whiteSpace:"",textAlign:""});
        },alternative);
        const typography=await paragraph.evaluate(p=>({height:p.getBoundingClientRect().height,alignment:getComputedStyle(p).textAlign,code:p.querySelector("code").textContent,bodyWidth:p.getBoundingClientRect().width}));
        observations.push({width,theme,typographyAlternative:alternative,typography});
        if([320,1440].includes(width)) await paragraph.screenshot({path:`${output}/${width}-${theme}-code-${alternative}.png`});
      }
      await paragraph.evaluate(p=>{p.removeAttribute("style");p.querySelector("code").removeAttribute("style");});
      assert.equal(await paragraph.evaluate(p=>getComputedStyle(p).textAlign),"start");
      assert.equal(await page.locator("[data-prose-sample]").evaluate(p=>getComputedStyle(p).textAlign),"justify");
      assert.match(await page.locator(".link-card").first().evaluate(card=>getComputedStyle(card).fontFamily),/Noto Sans KR/);
      assert.equal(await page.locator('a[href="https://example.com/text-only"] img').count(),0);
      assert.equal(await page.locator('a[href="https://example.com/missing"] strong').textContent(),"Authored fallback");
      await page.locator('[data-quality-fixture]').screenshot({path:`${output}/${width}-${theme}-final.png`});
    }
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/comparison.json`,JSON.stringify({result:"PASS",browser:browser.version(),externalRequests:"blocked; synthetic images intercepted",observations},null,2));
  console.log(JSON.stringify({result:"PASS",widths:[320,390,768,1440],themes:["light","dark"],imageAlternatives:["cover","intrinsic","contain"],typographyAlternatives:["justify","inline-block","start"],output}));
} finally {
  await browser.close();
  await server.stop();
}
