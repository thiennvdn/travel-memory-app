import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { mockStats } from "../data/mockMemories";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hành trình của bạn</Text>
      <View style={styles.grid}>
        <StatCard label="Tỉnh/thành đã đến" value={mockStats.provinces} />
        <StatCard label="Chuyến đi" value={mockStats.trips} />
        <StatCard label="Điểm bay dù" value={mockStats.flightSpots} />
        <StatCard label="Kỷ niệm đã lưu" value={mockStats.memoriesSaved} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%",
    backgroundColor: "#f6f6f4",
    borderRadius: 10,
    padding: 12,
  },
  label: { fontSize: 12, color: "#595959" },
  value: { fontSize: 22, fontWeight: "500", marginTop: 4 },
});
