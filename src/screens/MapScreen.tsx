import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Memory } from "../types/memory";
import { useMemories } from "../hooks/useMemories";
import MemoryPreviewCard from "../components/MemoryPreviewCard";
import { getRegionForCoordinates } from "../utils/mapRegion";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const isDeletingRef = useRef(false);

  async function handleDeleteSelected() {
    if (!selected) return;
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      const success = await deleteMemory(selected);
      if (success) {
        setSelected(null);
      }
    } finally {
      isDeletingRef.current = false;
    }
  }

  const { data: memories, loading, error, deleteMemory } = useMemories();

  const initialRegion = useMemo(
    () => getRegionForCoordinates(memories ?? []),
    [memories]
  );

  useEffect(() => {
    if (!memories) return;
    let cancelled = false;

    async function centerOnUser() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return; // giữ nguyên initialRegion (đã canh vừa khung chứa hết pin)
        }
        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setShowsUserLocation(true);
        mapRef.current?.animateToRegion(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          400
        );
      } catch {
        // Lấy vị trí lỗi -> giữ nguyên initialRegion (fallback âm thầm).
      }
    }

    centerOnUser();
    return () => {
      cancelled = true;
    };
  }, [memories]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bản đồ của bạn</Text>
      <View style={styles.mapArea}>
        {loading && <Text style={styles.statusText}>Đang tải...</Text>}
        {!loading && error && <Text style={styles.statusText}>{error}</Text>}
        {!loading && !error && memories && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={showsUserLocation}
          >
            {memories.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -24.5 }}
                tracksViewChanges={false}
                onPress={() => setSelected(m)}
              >
                <View style={styles.pinWrap}>
                  <View style={[styles.pinCircle, { backgroundColor: m.color }]} />
                  <View style={styles.pinTail} />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        <Pressable style={styles.fab} accessibilityLabel="Thêm kỷ niệm mới">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>

        {selected && (
          <MemoryPreviewCard
            memory={selected}
            onClose={() => setSelected(null)}
            onDelete={handleDeleteSelected}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "500", padding: 16 },
  mapArea: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E6F1FB",
  },
  statusText: { flex: 1, textAlign: "center", paddingTop: 24, fontSize: 13, color: "#595959" },
  map: { flex: 1 },
  pinWrap: { alignItems: "center" },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#fff",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginTop: -2,
  },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});
