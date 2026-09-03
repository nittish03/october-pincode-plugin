#!/usr/bin/env node

import "dotenv/config";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function resolveFirstIpv4(hostname) {
  try {
    return execFileSync(
      process.execPath,
      [
        "-e",
        "require('node:dns').resolve4(process.argv[1], (error, addresses) => { if (error || !addresses.length) process.exit(1); console.log(addresses[0]); })",
        hostname,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return null;
  }
}

function prismaDatasourceUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);

    if (!url.hostname.includes(".neon.tech")) {
      return rawUrl;
    }

    const directHost = url.hostname.replace("-pooler.", ".");
    const endpointId = directHost.split(".")[0];
    const ipv4Address = resolveFirstIpv4(directHost);

    if (!ipv4Address || !endpointId) {
      return rawUrl;
    }

    url.hostname = ipv4Address;
    url.searchParams.delete("channel_binding");
    url.searchParams.set("sslaccept", "accept_invalid_certs");
    url.searchParams.set("options", `endpoint=${endpointId}`);

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: node scripts/prisma-direct-url.mjs <prisma args...>");
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: prismaDatasourceUrl(process.env.DATABASE_URL),
  DIRECT_DATABASE_URL: prismaDatasourceUrl(process.env.DIRECT_DATABASE_URL),
};

const prismaBin = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

if (!existsSync(prismaBin)) {
  console.error("Local Prisma binary not found. Run npm install first.");
  process.exit(1);
}

const result = spawnSync(prismaBin, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
