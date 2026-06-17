import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  baseURL: "/modeler/",
  compressPublicAssets: { gzip: true, brotli: true },
});