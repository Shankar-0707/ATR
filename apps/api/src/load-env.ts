import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Repo root `.env` — cwd may be `apps/api` when using `npm run dev -w`, so avoid relying on `dotenv/config` alone. */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(repoRoot, ".env") });
