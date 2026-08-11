import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { mockMemories, Memory } from "../data/mockMemories";
import MemoryPreviewCard from "../components/MemoryPreviewCard";
import { getRegionForCoordinates } from "../utils/mapRegion";

const initialRegion = getRegionForCoordinates(mockMemories);

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Memory | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bản đồ của bạn</Text>
      <View style={styles.mapArea}>
        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
          {mockMemories.map((m) => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              onPress={() => setSelected(m)}
            >
              <View style={styles.pinWrap}>
                <View style={[styles.pinCircle, { backgroundColor: m.color }]} />
                <View style={styles.pinTail} />
              </View>
            </Marker>
          ))}
        </MapView>

        <Pressable style={styles.fab} accessibilityLabel="Thêm kỷ niệm mới">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>

        {selected && (
          <MemoryPreviewCard memory={selected} onClose={() => setSelected(null)} />
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
