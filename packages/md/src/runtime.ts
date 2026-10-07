// Runtime consumers avoid loading build-time processors and native parser bindings.
export { default as schema } from "./plugins/schema";
export { externalHttpUrl } from "./plugins/mdast/external-link/normalize";
