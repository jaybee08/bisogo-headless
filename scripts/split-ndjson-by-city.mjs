import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const IN_FILE = process.argv[2]; // e.g. data/agoda/agoda-ph-hotels.rich.ndjson
if (!IN_FILE) {
  console.error("Usage: node scripts/split-ndjson-by-city.mjs <input-ndjson>");
  process.exit(1);
}
if (!fs.existsSync(IN_FILE)) {
  console.error("Input not found:", IN_FILE);
  process.exit(1);
}

const OUT_DIR = path.resolve("data/agoda/cities");
fs.mkdirSync(OUT_DIR, { recursive: true });

const writers = new Map(); // cityId -> WriteStream
const counts = new Map();

function getWriter(cityId) {
  const key = String(cityId);
  if (writers.has(key)) return writers.get(key);

  const filePath = path.join(OUT_DIR, `${key}.ndjson`);
  const ws = fs.createWriteStream(filePath, { flags: "w" });
  writers.set(key, ws);
  counts.set(key, 0);
  return ws;
}

async function main() {
  console.log("Splitting:", IN_FILE);
  console.log("Out dir:", OUT_DIR);

  const rl = readline.createInterface({
    input: fs.createReadStream(IN_FILE),
    crlfDelay: Infinity,
  });

  let lines = 0;
  let bad = 0;

  for await (const line of rl) {
    lines++;
    if (!line.trim()) continue;

    try {
      const obj = JSON.parse(line);
      const cityId = obj.cityId;
      if (!cityId) continue;

      const ws = getWriter(cityId);
      ws.write(line + "\n");

      const key = String(cityId);
      counts.set(key, (counts.get(key) || 0) + 1);
    } catch {
      bad++;
    }

    if (lines % 200000 === 0) {
      console.log(`Processed ${lines.toLocaleString()} lines...`);
    }
  }

  // close all streams
  await Promise.all(
    Array.from(writers.values()).map(
      (ws) => new Promise((resolve) => ws.end(resolve))
    )
  );

  const manifest = Object.fromEntries(
    Array.from(counts.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))
  );
  fs.writeFileSync(path.resolve("data/agoda/agoda-ph-cities-manifest.json"), JSON.stringify(manifest));

  console.log("Done.");
  console.log("Total lines:", lines.toLocaleString());
  console.log("Bad lines:", bad.toLocaleString());
  console.log("Manifest written: data/agoda/agoda-ph-cities-manifest.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});