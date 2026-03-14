import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // 1. 引入 path

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // 避免多份 React 实例导致 "读取 useCallback" 等 hook 报错
    dedupe: ["react", "react-dom"],
  },
});
