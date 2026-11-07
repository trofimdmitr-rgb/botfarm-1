// Зашивает db/001_init.sql в server/schema.gen.ts, чтобы сервер мог сам создать таблицы в пустой базе.
import { readFileSync, writeFileSync } from "node:fs";
const sql = readFileSync(new URL("../db/001_init.sql", import.meta.url), "utf8");
// идемпотентные доработки схемы для уже существующих баз (выполняются при каждом холодном старте)
const migrations = ["003_links.sql"].map((f) => readFileSync(new URL(`../db/${f}`, import.meta.url), "utf8")).join("\n");
writeFileSync(
  new URL("../server/schema.gen.ts", import.meta.url),
  `// Сгенерировано scripts/gen-schema.mjs из db/001_init.sql и db/003_*.sql — не править руками.\nexport const SCHEMA_SQL = ${JSON.stringify(sql)};\nexport const MIGRATIONS_SQL = ${JSON.stringify(migrations)};\n`,
);
console.log("server/schema.gen.ts обновлён");
