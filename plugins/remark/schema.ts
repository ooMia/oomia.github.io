import { z } from "astro/zod";
import readingTime from "./reading-time/schema";

export default z.object({ readingTime }).catchall(z.unknown());
