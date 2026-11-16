import fs from "fs";
import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();
const data = JSON.parse(fs.readFileSync("sqlite-export.json", "utf8"));
const models = Prisma.dmmf.datamodel.models;

// order models so parent tables are inserted before the tables that reference them
const sorted = [];
const seen = new Set();
function visit(m) {
  if (seen.has(m.name)) return;
  seen.add(m.name);
  for (const f of m.fields) {
    if (f.kind === "object" && f.relationFromFields?.length && f.type !== m.name) {
      visit(models.find((x) => x.name === f.type));
    }
  }
  sorted.push(m);
}
models.forEach(visit);

function convert(model, row) {
  const o = {};
  for (const f of model.fields) {
    if (f.kind === "object") continue;
    let v = row[f.dbName ?? f.name];
    if (v === undefined) continue;
    if (v !== null) {
      if (f.type === "Boolean") v = Boolean(v);
      else if (f.type === "DateTime") v = new Date(isNaN(Number(v)) ? v : Number(v));
      else if (f.type === "Json" && typeof v === "string") v = JSON.parse(v);
      else if (f.type === "BigInt") v = BigInt(v);
    }
    o[f.name] = v;
  }
  return o;
}

for (const model of sorted) {
  const rows = data[model.dbName ?? model.name] ?? [];
  if (!rows.length) continue;
  const accessor = model.name[0].toLowerCase() + model.name.slice(1);
  await db[accessor].createMany({
    data: rows.map((r) => convert(model, r)),
    skipDuplicates: true,
  });
  console.log("imported", model.name, rows.length);

  // fix auto-increment counters so new rows don't collide with imported ids
  const idField = model.fields.find((f) => f.isId && f.type === "Int" && f.default?.name === "autoincrement");
  if (idField) {
    const t = model.dbName ?? model.name;
    await db.$queryRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"', '${idField.name}'), COALESCE((SELECT MAX("${idField.name}") FROM "${t}"), 1))`
    );
  }
}
await db.$disconnect();