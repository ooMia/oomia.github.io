import { z } from "astro/zod";
import readingTime from "./mdast/reading-time/schema";
export default z.object({ readingTime }).catchall(z.unknown());
