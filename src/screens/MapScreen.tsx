import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mockMemories, Memory } from "../data/mockMemories";
import MemoryPreviewCard from "../components/MemoryPreviewCard";

// Ghi chú: đây là bản đồ giả lập (đặt pin theo tỉ lệ x/y 0-1 trên 1 khung phẳng).
// Bước sau sẽ thay bằng react-native-maps hoặc Mapbox + toạ độ lat/lng thật.
export default function MapScreen() {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<Memory | null>(null);
  const mapHeight = 420;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bản đồ của bạn</Text>
      <View style={[styles.mapArea, { height: mapHeight }]}>
        {mockMemories.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setSelected(m)}
            style={[
              styles.pinWrap,
              { left: m.x * (width - 32) - 22, top: m.y * mapHeight - 22 },
            ]}
          >
            <View style={[styles.pinCircle, { backgroundColor: m.color }]} />
            <View style={styles.pinTail} />
          </Pressable>
        ))}

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
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#E6F1FB",
    overflow: "hidden",
  },
  pinWrap: { position: "absolute", alignItems: "center" },
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
