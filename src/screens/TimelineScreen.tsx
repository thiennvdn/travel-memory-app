import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Memory } from "../types/memory";
import { useMemories } from "../hooks/useMemories";

function TimelineRow({ item }: { item: Memory }) {
  return (
    <View style={styles.row}>
      <View style={[styles.thumb, { backgroundColor: item.color }]} />
      <View>
        <Text style={styles.place}>{item.place}</Text>
        <Text style={styles.meta}>
          {item.date} · {item.note}
        </Text>
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const { data: memories, loading, error } = useMemories();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dòng thời gian</Text>
      {loading && <Text style={styles.statusText}>Đang tải...</Text>}
      {!loading && error && <Text style={styles.statusText}>{error}</Text>}
      {!loading && !error && (
        <FlatList
          data={memories ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          renderItem={({ item }) => <TimelineRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 16 },
  title: { fontSize: 16, fontWeight: "500", paddingHorizontal: 16, marginBottom: 12 },
  statusText: { fontSize: 13, color: "#595959", paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#f6f6f4",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  place: { fontSize: 13, fontWeight: "500" },
  meta: { fontSize: 11, color: "#595959", marginTop: 2, maxWidth: 220 },
});
