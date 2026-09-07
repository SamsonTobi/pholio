import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@pholio/shared/mcpSchemas": path.resolve(__dirname, "../../packages/shared/src/mcpSchemas.ts"),
      "@pholio/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});
