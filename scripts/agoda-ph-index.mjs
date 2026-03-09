// scripts/agoda-ph-index.mjs
import fs from "node:fs";
import path from "node:path";
import unzipper from "unzipper";
import { parse } from "@fast-csv/parse";

const ZIP_PATH = process.argv[2];
if (!ZIP_PATH) {
  console.error("Usage: node scripts/agoda-ph-index.mjs <path-to-zip>");
  process.exit(1);
}
if (!fs.existsSync(ZIP_PATH)) {
  console.error("Zip file not found:", ZIP_PATH);
  process.exit(1);
}

const OUT_DIR = path.resolve("data/agoda");
fs.mkdirSync(OUT_DIR, { recursive: true });

const OUT_NDJSON = path.join(OUT_DIR, "agoda-ph-hotels.rich.ndjson");
const OUT_CITY_INDEX = path.join(OUT_DIR, "agoda-ph-city-hotels.json");
const OUT_CITIES = path.join(OUT_DIR, "agoda-ph-cities.json");

const OVERVIEW_MAX_CHARS = 800; // adjust (e.g. 400, 1200)

function cleanStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cleanUrl(u) {
  const s = cleanStr(u);
  if (!s || s === "0") return null;
  return s;
}

function toNum(v) {
  const s = cleanStr(v);
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toFloat(v) {
  const s = cleanStr(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getField(row, key) {
  if (row[key] !== undefined) return row[key];
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lowerKey) return row[k];
  }
  return undefined;
}

async function main() {
  console.log("Reading zip:", ZIP_PATH);
  console.log("Writing:", OUT_NDJSON);

  const out = fs.createWriteStream(OUT_NDJSON, { flags: "w" });

  // cityId -> hotelIds[]
  const cityIndex = new Map();
  const pushCityHotel = (cityId, hotelId) => {
    const key = String(cityId);
    const arr = cityIndex.get(key);
    if (arr) arr.push(hotelId);
    else cityIndex.set(key, [hotelId]);
  };

  // cityId -> city meta
  const citiesMap = new Map();
  const upsertCity = ({ cityId, city, state, country, countryISO }) => {
    const key = String(cityId);
    if (!citiesMap.has(key)) {
      citiesMap.set(key, { cityId, city, state, country, countryISO });
    }
  };

  const directory = await unzipper.Open.file(ZIP_PATH);
  const csvEntry = directory.files.find((f) => f.path.toLowerCase().endsWith(".csv"));

  if (!csvEntry) {
    console.error("No CSV found inside zip.");
    process.exit(1);
  }

  console.log("Found CSV inside zip:", csvEntry.path);

  let rows = 0;
  let phRows = 0;
  let kept = 0;

  await new Promise((resolve, reject) => {
    const parser = parse({
      headers: true,
      ignoreEmpty: true,
      trim: true,
      quote: '"',
      escape: '"',
      delimiter: ",",
      strictColumnHandling: false,
      discardUnmappedColumns: false,
    });

    let printedDebug = false;

    parser
      .on("error", reject)
      .on("data", (row) => {
        rows++;

        const countryISO = cleanStr(getField(row, "countryisocode")).toUpperCase();
        if (countryISO !== "PH") return;

        phRows++;

        const hotelId = toNum(getField(row, "hotel_id"));
        const cityId = toNum(getField(row, "city_id"));
        if (!hotelId || !cityId) return;

        // City meta (for dropdown)
        const city = cleanStr(getField(row, "city"));
        const state = cleanStr(getField(row, "state"));
        const country = cleanStr(getField(row, "country"));
        upsertCity({ cityId, city, state, country, countryISO });

        // City -> hotels index (optional but useful)
        pushCityHotel(cityId, hotelId);

        // Photos
        const photos = [
          cleanUrl(getField(row, "photo1")),
          cleanUrl(getField(row, "photo2")),
          cleanUrl(getField(row, "photo3")),
          cleanUrl(getField(row, "photo4")),
          cleanUrl(getField(row, "photo5")),
        ].filter(Boolean);

        // Rich fields
        const hotelName = cleanStr(getField(row, "hotel_name"));
        const hotelTranslatedName = cleanStr(getField(row, "hotel_translated_name"));
        const hotelFormerlyName = cleanStr(getField(row, "hotel_formerly_name"));

        const address1 = cleanStr(getField(row, "addressline1"));
        const address2 = cleanStr(getField(row, "addressline2"));
        const zipcode = cleanStr(getField(row, "zipcode"));

        const latitude = toFloat(getField(row, "latitude"));
        const longitude = toFloat(getField(row, "longitude"));

        const starRating = toFloat(getField(row, "star_rating"));
        const accommodationType = cleanStr(getField(row, "accommodation_type"));

        const checkInTime = cleanStr(getField(row, "checkin"));
        const checkOutTime = cleanStr(getField(row, "checkout"));

        const numberRooms = toNum(getField(row, "numberrooms"));
        const numberFloors = toNum(getField(row, "numberfloors"));
        const yearOpened = toNum(getField(row, "yearopened"));
        const yearRenovated = toNum(getField(row, "yearrenovated"));

        const chainId = toNum(getField(row, "chain_id"));
        const chainName = cleanStr(getField(row, "chain_name"));
        const brandId = toNum(getField(row, "brand_id"));
        const brandName = cleanStr(getField(row, "brand_name"));

        const overviewRaw = cleanStr(getField(row, "overview"));
        const overview = overviewRaw ? overviewRaw.slice(0, OVERVIEW_MAX_CHARS) : "";

        // Optional CSV rating fields (use as fallback, not canonical)
        const ratingAverage = toFloat(getField(row, "rating_average"));
        const numberOfReviews = toNum(getField(row, "number_of_reviews"));

        // Debug the first PH row we parse
        if (!printedDebug) {
          printedDebug = true;
          console.log("DEBUG first PH row parsed:", {
            hotelId,
            cityId,
            hotelName,
            city,
            state,
            photo1: photos[0] || null,
          });
        }

        // You said you need cityId and photos; for Rich we still keep rows even if photos missing,
        // but carousel needs photos. We’ll still write the record; photos[] may be empty.
        kept++;

        const record = {
          hotelId,
          cityId,
          city,
          state,
          country,
          countryISO,

          hotelName,
          hotelTranslatedName: hotelTranslatedName || undefined,
          hotelFormerlyName: hotelFormerlyName || undefined,

          chain: chainId ? { chainId, chainName } : undefined,
          brand: brandId ? { brandId, brandName } : undefined,

          address: {
            line1: address1 || undefined,
            line2: address2 || undefined,
            zipcode: zipcode || undefined,
          },

          geo: {
            lat: latitude ?? undefined,
            lng: longitude ?? undefined,
          },

          starRating: starRating ?? undefined,
          accommodationType: accommodationType || undefined,

          checkInTime: checkInTime || undefined,
          checkOutTime: checkOutTime || undefined,

          numberRooms: numberRooms || undefined,
          numberFloors: numberFloors || undefined,
          yearOpened: yearOpened || undefined,
          yearRenovated: yearRenovated || undefined,

          overview: overview || undefined,

          csvRating: ratingAverage ?? undefined,
          csvReviewCount: numberOfReviews || undefined,

          photos, // array (0..5)
        };

        out.write(JSON.stringify(record) + "\n");

        if (rows % 200000 === 0) {
          console.log(
            `Processed ${rows.toLocaleString()} rows | PH rows ${phRows.toLocaleString()} | written ${kept.toLocaleString()}`
          );
        }
      })
      .on("end", resolve);

    csvEntry.stream().pipe(parser);
  });

  await new Promise((resolve) => out.end(resolve));

  // Write city -> hotels JSON
  const cityObj = {};
  for (const [cityId, ids] of cityIndex.entries()) cityObj[cityId] = ids;
  fs.writeFileSync(OUT_CITY_INDEX, JSON.stringify(cityObj));

  // Write cities JSON (sorted by city name)
  const cities = Array.from(citiesMap.values()).sort((a, b) =>
    (a.city || "").localeCompare(b.city || "", "en")
  );
  fs.writeFileSync(OUT_CITIES, JSON.stringify(cities));

  console.log("Done.");
  console.log("Processed rows:", rows.toLocaleString());
  console.log("PH rows:", phRows.toLocaleString());
  console.log("Written PH records:", kept.toLocaleString());
  console.log("City index written:", OUT_CITY_INDEX);
  console.log("Cities list written:", OUT_CITIES);
  console.log("NDJSON written:", OUT_NDJSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});