import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/payroll/**/*.test.ts",
      "lib/contractors/**/*.test.ts",
      "lib/finalpay/**/*.test.ts",
      "lib/__tests__/**/*.test.ts",
      "components/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
