#!/usr/bin/env node
import { main } from "./src/cli.js";

main(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (error) => {
    console.error(`\n✖ ${error?.message || error}`);
    process.exit(1);
  }
);
