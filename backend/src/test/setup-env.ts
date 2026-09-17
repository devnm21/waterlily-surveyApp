import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wl-api-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.SESSION_SECRET = "test-session-secret";
