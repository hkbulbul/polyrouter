#!/usr/bin/env node
import { main } from "./src/cli.js";
import { c, sym } from "./src/ui.js";

main(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (error) => {
    console.error(`\n${c.red(sym.err)} ${c.bold(error?.message || error)}\n`);
    process.exit(1);
  }
);
