import ph from "@/data/ph-locations.json";

export type PHCity = { name: string; zipcodes: string[] };
export type PHProvince = { code: string; name: string; cities: PHCity[] };

const provinces = (ph as any).provinces as PHProvince[];

export function getPHProvinces(): PHProvince[] {
  return provinces;
}

export function getPHProvince(code: string): PHProvince | undefined {
  const c = (code || "").toUpperCase();
  return provinces.find((p) => p.code.toUpperCase() === c);
}

export function getPHCities(provinceCode: string): PHCity[] {
  return getPHProvince(provinceCode)?.cities ?? [];
}

export function getPHZipcodes(provinceCode: string, cityName: string): string[] {
  const city = getPHCities(provinceCode).find(
    (c) => c.name.toLowerCase() === (cityName || "").toLowerCase()
  );
  return city?.zipcodes ?? [];
}