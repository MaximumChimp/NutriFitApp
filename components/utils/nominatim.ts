// utils/nominatim.ts
export const reverseGeocodeWithNominatim = async (coords: {
  latitude: number;
  longitude: number;
}): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName/1.0 (your@email.com)' // Required by Nominatim usage policy
      }
    });
    const data = await response.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.warn('Nominatim reverse geocoding failed:', error);
    return 'Unknown location';
  }
};

export const searchAddressWithNominatim = async (query: string): Promise<any[]> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&addressdetails=1&limit=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName/1.0 (your@email.com)' // Required by Nominatim usage policy
      }
    });
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.warn('Nominatim address search failed:', error);
    return [];
  }
};
