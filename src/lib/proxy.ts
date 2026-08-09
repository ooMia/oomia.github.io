export type TagCondition = "always" | "if" | "ifNot";

const PREFIX_RULE: Record<TagCondition, string> = {
  always: "",
  if: "if_",
  ifNot: "if_not_",
};

// 2. 스키마 프록시 타입 정의
export type SchemaProxy<T, RAW = T> = (T extends { description: infer D }
  ? { $doc: D }
  : {}) & {
  [
    K in keyof T as K extends "description" | "isOption" ? never : K
  ]: SchemaProxy<T[K], RAW>;
} & {
  toString(): string;
  valueOf(): string;
  toValue(optional?: boolean): string;
};

// 3. 런타임 Proxy 생성 함수
export function createSchemaProxy<T extends object>(
  rawSchema: T,
  path: string[] = [],
): SchemaProxy<T> {
  const target = () => {};

  return new Proxy(target, {
    get(_, prop: string | symbol) {
      // 1) 기본 ID 생성 로직 (path를 _로 연결)
      const rawId = path.join("_");

      // 2) 스키마 메타데이터에서 isOption 기본값 탐색
      const isSchemaOption = Boolean(
        getNestedProperty(rawSchema, path)?.isOption,
      );

      // 3) [치환자 Value 반환 메서드] - .toValue()
      if (prop === "toValue") {
        return (optional?: boolean) => {
          const isOpt = optional ?? isSchemaOption;
          const id = isOpt ? `var_${rawId}` : rawId;
          return `[##_${id}_##]`;
        };
      }

      // 4) 문자열/원시값 형변환 (기존 toString 유지)
      if (
        prop === "toString" ||
        prop === "valueOf" ||
        prop === Symbol.toPrimitive
      ) {
        return () => rawId;
      }

      // 5) 메타데이터($doc) 접근
      if (prop === "$doc") {
        return getNestedProperty(rawSchema, path)?.description;
      }

      // 6) 비동기/심볼 예외 처리
      if (prop === "then" || typeof prop === "symbol") {
        return undefined;
      }

      // 7) 하위 경로 재귀 생성
      return createSchemaProxy(rawSchema, [...path, String(prop)]);
    },
  }) as unknown as SchemaProxy<T>;
}

// 경로 배열을 따라 원본 스키마 객체의 해당 속성 노드를 찾는 헬퍼
function getNestedProperty(obj: any, path: string[]) {
  let current = obj;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}
