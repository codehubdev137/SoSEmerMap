// Geocoding and Search utilities using OpenStreetMap Nominatim API (free, no API key)

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&accept-language=th&countrycodes=th&limit=5`,
      {
        headers: {
          'User-Agent': 'SOSMapCommunity/1.0',
        },
      }
    );
    if (!res.ok) throw new Error('Nominatim search failed');
    return await res.json();
  } catch (err) {
    console.warn('Place search failed:', err);
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SOSMapCommunity/1.0',
        },
      }
    );
    if (!res.ok) throw new Error('Nominatim request failed');

    const data = await res.json();

    // Build a concise, human-readable Thai address
    const addr = data.address || {};
    const parts: string[] = [];

    // Road / neighbourhood / place
    if (addr.road) parts.push(addr.road);
    else if (addr.pedestrian) parts.push(addr.pedestrian);
    else if (addr.neighbourhood) parts.push(addr.neighbourhood);

    // Sub-district (แขวง / ตำบล)
    if (addr.suburb) parts.push(addr.suburb);
    else if (addr.quarter) parts.push(addr.quarter);

    // District (เขต / อำเภอ)
    if (addr.city_district) parts.push(addr.city_district);
    else if (addr.county) parts.push(addr.county);

    // City / Province
    if (addr.city) parts.push(addr.city);
    else if (addr.town) parts.push(addr.town);
    else if (addr.state) parts.push(addr.state);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // Fallback to display_name
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',').trim();
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
