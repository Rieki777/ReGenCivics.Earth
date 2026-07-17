/**
 * Approximate centroids for the seeded One Earth bioregions, keyed by
 * bioregions.slug (scripts/seed-bioregions.ts is the vocabulary source).
 *
 * Used by the Civics globe's season-activity layer (Phase B1, improvement 2)
 * to place per-bioregion aggregate glow markers. These are hand-placed
 * regional centers for a world-scale glow, not survey data; a few degrees of
 * drift is invisible at globe zoom. Community-submitted bioregions
 * (source = "community") have no entry and simply don't render on the globe;
 * their counts still appear in the accessible fallback list.
 */

export type BioregionCentroid = { lat: number; lng: number };

export const BIOREGION_CENTROIDS: Record<string, BioregionCentroid> = {
  // Nearctic
  "pacific-northwest-coastal-forests": { lat: 47.5, lng: -123.5 },
  "columbia-plateau-blue-mountains": { lat: 45.5, lng: -118.5 },
  "sierra-nevada-transverse-ranges": { lat: 37.0, lng: -119.0 },
  "california-coastal-sage-chaparral": { lat: 34.0, lng: -118.5 },
  "sonoran-desert": { lat: 32.5, lng: -112.5 },
  "chihuahuan-desert-sierra-madre": { lat: 27.5, lng: -105.0 },
  "rocky-mountains-northern-great-plains": { lat: 46.0, lng: -110.0 },
  "great-plains-grasslands": { lat: 39.5, lng: -100.0 },
  "great-lakes-mixed-forests": { lat: 45.0, lng: -84.0 },
  "appalachian-atlantic-coast-forests": { lat: 38.5, lng: -79.0 },
  "southeastern-coastal-plain": { lat: 32.0, lng: -83.0 },
  "florida-peninsula-everglades": { lat: 27.0, lng: -81.5 },
  "new-england-acadian-forests": { lat: 44.5, lng: -70.0 },
  "boreal-plains-canadian-shield": { lat: 55.0, lng: -95.0 },
  "alaska-yukon-interior": { lat: 64.0, lng: -150.0 },
  "arctic-tundra-polar-bear": { lat: 70.0, lng: -100.0 },
  "hawaiian-islands": { lat: 20.5, lng: -157.0 },
  // Neotropical
  "mesoamerican-dry-forests": { lat: 17.5, lng: -99.0 },
  "central-american-rainforests": { lat: 12.0, lng: -85.0 },
  "yucatan-belize-forests": { lat: 18.5, lng: -89.0 },
  "amazon-river-basin": { lat: -4.0, lng: -63.0 },
  "atlantic-forest-brazil": { lat: -21.0, lng: -44.0 },
  "cerrado-savannas": { lat: -14.0, lng: -47.0 },
  "pantanal-wetlands": { lat: -17.5, lng: -56.5 },
  "gran-chaco": { lat: -24.0, lng: -61.0 },
  "pampas-grasslands": { lat: -35.0, lng: -60.0 },
  "patagonian-steppe-andes": { lat: -44.0, lng: -70.0 },
  "valdivian-temperate-rainforest": { lat: -40.0, lng: -73.0 },
  "caribbean-islands": { lat: 18.5, lng: -70.0 },
  "orinoco-delta-llanos": { lat: 8.0, lng: -66.0 },
  "andes-cloud-forests": { lat: -1.0, lng: -78.0 },
  // Palearctic
  "british-isles-ireland": { lat: 53.5, lng: -3.0 },
  "western-european-broadleaf-forests": { lat: 48.5, lng: 4.0 },
  "iberian-peninsula": { lat: 40.0, lng: -4.0 },
  "mediterranean-basin": { lat: 37.0, lng: 10.0 },
  "italian-peninsula-adriatic": { lat: 42.5, lng: 13.5 },
  "balkan-peninsula": { lat: 42.0, lng: 21.5 },
  "central-european-forests": { lat: 50.0, lng: 12.0 },
  "carpathians-danubian-forests": { lat: 46.5, lng: 24.0 },
  "scandinavia-northern-fennoscandia": { lat: 63.0, lng: 16.0 },
  "baltic-sea-eastern-baltic": { lat: 57.5, lng: 24.0 },
  "east-european-steppe-forest-steppe": { lat: 50.0, lng: 35.0 },
  "caucasus-greater-caucasus": { lat: 42.5, lng: 44.5 },
  "western-siberia-taiga-tundra": { lat: 62.0, lng: 75.0 },
  "eastern-siberia-far-east": { lat: 62.0, lng: 130.0 },
  "central-asian-steppes-deserts": { lat: 45.0, lng: 65.0 },
  "tibetan-plateau-himalayas": { lat: 32.0, lng: 88.0 },
  "arabian-peninsula-deserts": { lat: 23.0, lng: 45.0 },
  "levant-eastern-mediterranean": { lat: 33.5, lng: 36.0 },
  "mesopotamia-zagros": { lat: 33.0, lng: 44.0 },
  "iranian-plateau": { lat: 32.5, lng: 54.0 },
  "north-china-plains-loess-plateau": { lat: 36.5, lng: 112.0 },
  "yellow-sea-bohai-coast": { lat: 37.5, lng: 121.0 },
  "japanese-archipelago": { lat: 36.5, lng: 138.0 },
  "korean-peninsula": { lat: 37.5, lng: 127.5 },
  // Afrotropical
  "sahara-desert": { lat: 23.0, lng: 10.0 },
  "sahel-savanna": { lat: 14.5, lng: 5.0 },
  "west-african-forests-coast": { lat: 7.0, lng: -5.0 },
  "congo-basin-rainforest": { lat: -1.0, lng: 22.0 },
  "east-african-savanna-rift-valley": { lat: -2.5, lng: 36.0 },
  "horn-of-africa-somali-plateau": { lat: 8.0, lng: 46.0 },
  "ethiopian-highlands": { lat: 9.5, lng: 38.5 },
  "southern-african-bushveld-kalahari": { lat: -24.0, lng: 24.0 },
  "cape-floristic-region-fynbos": { lat: -33.5, lng: 20.0 },
  "namib-karoo-deserts": { lat: -26.0, lng: 16.5 },
  "madagascar-mascarene-islands": { lat: -19.0, lng: 47.0 },
  // Indomalayan
  "indian-subcontinent-western-ghats": { lat: 14.0, lng: 75.0 },
  "gangetic-plains-himalayan-foothills": { lat: 26.5, lng: 82.0 },
  "sri-lanka-malabar-coast": { lat: 8.5, lng: 79.0 },
  "indochina-monsoon-forests": { lat: 17.0, lng: 102.0 },
  "mekong-river-delta": { lat: 10.0, lng: 106.0 },
  "sundaland-rainforests": { lat: 0.5, lng: 111.0 },
  "philippines-archipelago": { lat: 12.0, lng: 122.0 },
  "south-china-yunnan-subtropical": { lat: 24.5, lng: 105.0 },
  // Australasian
  "southwest-australian-woodlands": { lat: -32.5, lng: 117.0 },
  "murray-darling-basin": { lat: -33.0, lng: 145.0 },
  "eastern-australian-forests": { lat: -30.0, lng: 152.0 },
  "central-australian-desert": { lat: -24.5, lng: 133.0 },
  "top-end-savanna-arnhem-land": { lat: -13.5, lng: 133.5 },
  "tasmania-wet-sclerophyll-forests": { lat: -42.0, lng: 146.5 },
  "new-zealand-archipelago": { lat: -41.5, lng: 173.0 },
  "new-guinea-highlands-rainforests": { lat: -5.5, lng: 143.0 },
  "pacific-island-groups-melanesia": { lat: -16.5, lng: 167.0 },
  "polynesian-islands": { lat: -17.5, lng: -150.0 },
  "micronesian-islands": { lat: 7.5, lng: 152.0 },
  // Antarctic
  "antarctic-continent-ice-sheet": { lat: -80.0, lng: 0.0 },
  "sub-antarctic-islands": { lat: -53.0, lng: -38.0 },
};

export function bioregionCentroid(slug: string | null | undefined): BioregionCentroid | null {
  if (!slug) return null;
  return BIOREGION_CENTROIDS[slug] ?? null;
}
