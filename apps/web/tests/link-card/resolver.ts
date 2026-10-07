import { createLinkCardResolver } from "../../src/lib/content/link-card";
import invalidRecords from "./manifest-invalid.json";
import records from "./manifest.json";

// Compilation and component rendering must consume the same local inputs.
export default createLinkCardResolver([...records, ...invalidRecords]);
