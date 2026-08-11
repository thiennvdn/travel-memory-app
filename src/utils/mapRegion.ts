export type Coordinate = { latitude: number; longitude: number };

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const PADDING_FACTOR = 1.4;
const MIN_DELTA = 0.05;

// Vùng dự phòng khi không có toạ độ nào (trung tâm Việt Nam, thu nhỏ).
const FALLBACK_REGION: Region = {
  latitude: 16.0,
  longitude: 107.0,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// Tính vùng bản đồ (region) vừa đủ để chứa hết danh sách toạ độ, có đệm (padding).
export function getRegionForCoordinates(coordinates: Coordinate[]): Region {
  if (coordinates.length === 0) return FALLBACK_REGION;

  const latitudes = coordinates.map((c) => c.latitude);
  const longitudes = coordinates.map((c) => c.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PADDING_FACTOR, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PADDING_FACTOR, MIN_DELTA),
  };
}
