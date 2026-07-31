// 1. 원본 스키마에서 $doc(설명문)과 일반 경로 노드를 분리하여 추론하는 타입
type SchemaProxy<T, RAW = T> = (T extends { description: infer D }
  ? { $doc: D } // description이 존재하면 $doc 속성에 그 메타데이터 타입을 바인딩
  : {}) & {
  [K in keyof T as K extends "description" ? never : K]: SchemaProxy<T[K], RAW>;
} & {
  toString(): string;
  valueOf(): string;
};

// 2. 런타임 Proxy 생성 함수
export function createSchemaProxy<T extends object>(
  rawSchema: T,
  path: string[] = [],
): SchemaProxy<T> {
  const target = () => {};

  return new Proxy(target, {
    get(_, prop: string | symbol) {
      // 1) 형변환 처리
      if (
        prop === "toString" ||
        prop === "valueOf" ||
        prop === Symbol.toPrimitive
      ) {
        return () => path.join("_");
      }

      // 2) 메타데이터($doc) 접근 시 원본 스키마 객체에서 description 탐색
      if (prop === "$doc") {
        return getNestedDescription(rawSchema, path);
      }

      // 3) 비동기/심볼 예외 처리
      if (prop === "then" || typeof prop === "symbol") {
        return undefined;
      }

      // 4) 하위 경로 재귀 생성
      return createSchemaProxy(rawSchema, [...path, String(prop)]);
    },
  }) as unknown as SchemaProxy<T>;
}

// 경로 배열을 따라 원본 스키마의 description을 찾아내는 헬퍼
function getNestedDescription(obj: any, path: string[]) {
  let current = obj;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current?.description;
}
