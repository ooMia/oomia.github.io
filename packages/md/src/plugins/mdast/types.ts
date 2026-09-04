import { type MdastNode, type MdastVisitorContext } from "satteri"
export type MdastVisitorFn<N extends MdastNode = MdastNode> = (
  node: Readonly<N>,
  context: MdastVisitorContext
) => void
