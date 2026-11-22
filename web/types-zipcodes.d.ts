// Types for the "zipcodes" package (US ZIP code database used to place California cities and ZIPs on the map).
declare module 'zipcodes' {
  export interface ZipInfo { zip: string; latitude: number; longitude: number; city: string; state: string; country: string }
  const z: {
    lookup(zip: string): ZipInfo | undefined;
    lookupByName(city: string, state: string): ZipInfo[];
    lookupByCoords(lat: number, lng: number): ZipInfo | null;
  };
  export default z;
}
