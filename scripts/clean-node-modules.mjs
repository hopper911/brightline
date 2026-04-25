#!/usr/bin/env node
/**
 * Remove brightline/node_modules. Tries the known problematic path first
 * (directory with space in name) then the rest. Run from brightline/ directory.
 */
import fs from "fs";
import path from "path";

const nm = path.join(process.cwd(), "node_modules");
const badPath = path.join(nm, "@opentelemetry", "api 2");

function rm(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    console.warn("Warning:", e.message);
  }
}

if (fs.existsSync(badPath)) {
  rm(badPath);
}
if (fs.existsSync(nm)) {
  rm(nm);
}
