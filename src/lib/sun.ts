/**
 * Where it is day and night, for the StandBy world map. A standard low-precision solar model
 * (good to well under a degree, plenty for a dotted map).
 */

const RAD = Math.PI / 180;

/** The point on Earth where the sun is directly overhead, in degrees. */
export function subsolarPoint(date: Date): { lat: number; lon: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86_400_000; // fractional
  const g = (2 * Math.PI / 365) * (dayOfYear - 1);
  // NOAA fractional-year approximations for declination and the equation of time.
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqTimeMin =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lon = -15 * (utcHours - 12 + eqTimeMin / 60);
  lon = ((lon + 540) % 360) - 180;
  return { lat: decl / RAD, lon };
}

/** Sine of the sun's altitude at a place: above 0 is daylight. */
export function sunHeight(lat: number, lon: number, sub: { lat: number; lon: number }): number {
  return (
    Math.sin(lat * RAD) * Math.sin(sub.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos((lon - sub.lon) * RAD)
  );
}

/** Latitude of the day/night line at a longitude. */
export function terminatorLat(lon: number, sub: { lat: number; lon: number }): number {
  const decl = Math.abs(sub.lat) < 0.01 ? 0.01 : sub.lat;
  return Math.atan(-Math.cos((lon - sub.lon) * RAD) / Math.tan(decl * RAD)) / RAD;
}
