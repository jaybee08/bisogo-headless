export type AgodaCity = { slug: string; name: string; cityId: number };

export const AGODA_CITIES: AgodaCity[] = [
  { slug: "cebu", name: "Cebu", cityId: 4001 },
  { slug: "manila", name: "Manila", cityId: 1622 },
  { slug: "boracay", name: "Boracay", cityId: 15903 },
  { slug: "bohol", name: "Bohol", cityId: 16429 },

  // Palawan (add both)
  { slug: "puerto-princesa", name: "Puerto Princesa", cityId: /* paste ID */ 0 },
  { slug: "el-nido", name: "El Nido", cityId: /* paste ID */ 0 },
];