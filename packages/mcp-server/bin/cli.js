#!/usr/bin/env node

import("../src/index.js")
  .then((m) => m.runServer())
  .catch((err) => {
    console.error("Failed to start Pholio MCP server:", err);
    process.exit(1);
  });
