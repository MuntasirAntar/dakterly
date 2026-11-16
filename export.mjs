import Database from "better-sqlite3";
import fs from "fs";

// change this path if your dev.db is elsewhere (often prisma/dev.db or ./dev.db)
const sqlite = new Database("prisma/dev.db", { readonly: true });

const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'")
  .all();

const out = {};
for (const { name } of tables) {
  out[name] = sqlite.prepare(`SELECT * FROM "${name}"`).all();
  console.log(name, out[name].length, "rows");
}
fs.writeFileSync("sqlite-export.json", JSON.stringify(out));