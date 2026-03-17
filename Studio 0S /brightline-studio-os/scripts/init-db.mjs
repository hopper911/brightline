#!/usr/bin/env node
/**
 * Initialize SQLite DB and apply schema.
 * Run from project root: node scripts/init-db.mjs
 */
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "data");
const dbPath = join(dataDir, "studio.db");
const schemaPath = join(root, "lib", "db", "schema.sql");

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const schema = readFileSync(schemaPath, "utf-8");
const db = new Database(dbPath);
db.exec(schema);
db.close();
console.log("DB initialized at", dbPath);
