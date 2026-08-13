import { toString } from "mdast-util-to-string";
import getReadingTime from "./lib";
import type { AstroFileData, PluginFactory } from "../types";

export default function remarkReadingTime(): PluginFactory {
  return (tree, { data }) => {
    const { frontmatter } = data.astro as AstroFileData["astro"];
    // TODO: tree.children에 존재하는 AST 순회하며 Node 변환 로직 구현
    // 1. stringify된 html에 대한 AST 생성
    // 2. innerText 추출
    // 3. type=text 형태의 문자열로 치환
    // TODO: 자체 문자열화 로직 구현 후, 기존 유틸 라이브러리 삭제
    const content = toString(tree, { includeImageAlt: false, includeHtml: false });
    frontmatter.readingTime = {
      content,
      ...getReadingTime(content),
    };
  };
}
