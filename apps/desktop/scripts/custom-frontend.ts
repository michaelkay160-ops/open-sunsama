import { fileURLToPath } from "node:url";

const mode = Bun.argv[2];
if (mode !== "dev" && mode !== "build")
  throw new Error("Expected dev or build");

const web = Bun.spawnSync(
  mode === "dev"
    ? [process.execPath, "run", "dev", "--port", "3207", "--strictPort"]
    : [process.execPath, "x", "vite", "build"],
  {
    cwd: fileURLToPath(new URL("../../web", import.meta.url)),
    env: {
      ...process.env,
      VITE_API_URL: "http://localhost:3201",
      VITE_WS_URL: "ws://localhost:3201",
      VITE_DISABLE_DESKTOP_UPDATES: "true",
    },
    stdout: "inherit",
    stderr: "inherit",
  }
);
if (web.exitCode !== 0) process.exit(web.exitCode);

if (mode === "build") {
  const bundle = Bun.spawnSync(
    [
      process.execPath,
      fileURLToPath(new URL("./prepare-frontend.mjs", import.meta.url)),
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );
  process.exit(bundle.exitCode);
}
