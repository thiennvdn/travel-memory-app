import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { mockMemories, Memory } from "../data/mockMemories";

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dòng thời gian</Text>
      <FlatList
        data={mockMemories}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => <TimelineRow item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 16 },
  title: { fontSize: 16, fontWeight: "500", paddingHorizontal: 16, marginBottom: 12 },
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
