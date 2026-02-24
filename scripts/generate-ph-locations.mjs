import fs from "node:fs";
import path from "node:path";

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function norm(s) {
  return String(s ?? "").trim();
}

function upper(s) {
  return norm(s).toUpperCase();
}

// Map province name -> 3-letter code (use YOUR list so it matches Woo "state" codes)
const PROVINCE_CODE_MAP = {
  "METRO MANILA": "NCR",
  "CORDILLERA ADMINISTRATIVE REGION": "CAR",
  "CORDILLERA REGION": "CAR",
  "ABRA": "ABR",
  "AGUSAN DEL NORTE": "AGN",
  "AGUSAN DEL SUR": "AGS",
  "AKLAN": "AKL",
  "ALBAY": "ALB",
  "ANTIQUE": "ANT",
  "APAYAO": "APA",
  "AURORA": "AUR",
  "BASILAN": "BAS",
  "BATAAN": "BAN",
  "BATANES": "BTN",
  "BATANGAS": "BTG",
  "BENGUET": "BEN",
  "BILIRAN": "BIL",
  "BOHOL": "BOH",
  "BUKIDNON": "BUK",
  "BULACAN": "BUL",
  "CAGAYAN": "CAG",
  "CAMARINES NORTE": "CAN",
  "CAMARINES SUR": "CAS",
  "CAMIGUIN": "CAM",
  "CAPIZ": "CAP",
  "CATANDUANES": "CAT",
  "CAVITE": "CAV",
  "CEBU": "CEB",
  "DINAGAT ISLANDS": "DIN",
  "EASTERN SAMAR": "EAS",
  "GUIMARAS": "GUI",
  "IFUGAO": "IFU",
  "ILOCOS NORTE": "ILN",
  "ILOCOS SUR": "ILS",
  "ILOILO": "ILI",
  "ISABELA": "ISA",
  "KALINGA": "KAL",
  "LA UNION": "LUN",
  "LAGUNA": "LAG",
  "LANAO DEL NORTE": "LAN",
  "LANAO DEL SUR": "LAS",
  "LEYTE": "LEY",
  "MARINDUQUE": "MAD",
  "MASBATE": "MAS",
  "MISAMIS OCCIDENTAL": "MSC",
  "MISAMIS ORIENTAL": "MSN",
  "MOUNTAIN PROVINCE": "MOU",
  "NEGROS OCCIDENTAL": "NEC",
  "NEGROS ORIENTAL": "NER",
  "NORTHERN SAMAR": "NSA",
  "NUEVA ECIJA": "NUE",
  "NUEVA VIZCAYA": "NUV",
  "OCCIDENTAL MINDORO": "MDC",
  "ORIENTAL MINDORO": "MDR",
  "PALAWAN": "PLW",
  "PAMPANGA": "PAM",
  "PANGASINAN": "PAN",
  "QUEZON": "QUE",
  "QUIRINO": "QUI",
  "RIZAL": "RIZ",
  "ROMBLON": "ROM",
  "SAMAR": "WSA",
  "SIQUIJOR": "SIG",
  "SORSOGON": "SOR",
  "SOUTH COTABATO": "SCO",
  "SOUTHERN LEYTE": "SLE",
  "SURIGAO DEL NORTE": "SUN",
  "SURIGAO DEL SUR": "SUR",
  "TARLAC": "TAR",
  "TAWI-TAWI": "TAW",
  "ZAMBALES": "ZMB",
  "ZAMBOANGA DEL NORTE": "ZAN",
  "ZAMBOANGA DEL SUR": "ZAS",
  "ZAMBOANGA SIBUGAY": "ZSI",
};

function getProvinceCode(provName) {
  const key = upper(provName);
  return PROVINCE_CODE_MAP[key] || ""; // keep empty if unknown; you can inspect and add mapping if needed
}

function main() {
  const phzipsDir = path.join(process.cwd(), "node_modules", "phzips", "data");

  const provincesPath = path.join(phzipsDir, "provinces.json");
  const provLocationsPath = path.join(phzipsDir, "province_locations.json");

  if (!fs.existsSync(provincesPath) || !fs.existsSync(provLocationsPath)) {
    throw new Error(
      `Missing required phzips files.\nExpected:\n- ${provincesPath}\n- ${provLocationsPath}`
    );
  }

  const provincesMap = readJSON(provincesPath); // { "1": "Abra", ... }
  const provLocations = readJSON(provLocationsPath);
  // provLocations shape:
  // { "1": { "l": { "1": ["Bangued","2800"], ... } }, ... }

  const provinces = [];

  for (const [provId, groups] of Object.entries(provLocations)) {
    const provName = provincesMap?.[provId] ? norm(provincesMap[provId]) : norm(provId);
    if (!provName) continue;

    // cityName -> Set(zip)
    const cityZipMap = new Map();

    if (groups && typeof groups === "object") {
      for (const group of Object.values(groups)) {
        if (!group || typeof group !== "object") continue;

        for (const entry of Object.values(group)) {
          // entry is expected: [cityName, zip]
          if (!Array.isArray(entry) || entry.length < 2) continue;

          const cityName = norm(entry[0]);
          const zip = norm(entry[1]);

          if (!cityName || !zip) continue;

          if (!cityZipMap.has(cityName)) cityZipMap.set(cityName, new Set());
          cityZipMap.get(cityName).add(zip);
        }
      }
    }

    const cities = [...cityZipMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, set]) => ({
        name,
        zipcodes: [...set].sort(),
      }));

    // If a province has no cities, skip (avoids junk)
    if (!cities.length) continue;

    const code = getProvinceCode(provName);

    provinces.push({
      code: code || provName, // fallback: name if code missing
      name: provName,
      cities,
    });
  }

  // Sort provinces by name
  provinces.sort((a, b) => a.name.localeCompare(b.name));

  const out = { provinces };

  const outFile = path.join(process.cwd(), "data", "ph-locations.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");

  console.log(`✅ Wrote ${outFile} with ${out.provinces.length} provinces`);
}

main();