import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Memory } from "../data/mockMemories";

type Props = {
  memory: Memory;
  onClose: () => void;
};

export default function MemoryPreviewCard({ memory, onClose }: Props) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
        <Ionicons name="close" size={16} color="#595959" />
      </Pressable>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: memory.color }]} />
        <View style={styles.textCol}>
          <Text style={styles.place}>{memory.place}</Text>
          <Text style={styles.date}>{memory.date}</Text>
          <Text style={styles.note} numberOfLines={3}>
            {memory.note}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    padding: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  row: { flexDirection: "row", gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  textCol: { flex: 1, marginLeft: 10 },
  place: { fontSize: 14, fontWeight: "500" },
  date: { fontSize: 11, color: "#595959", marginBottom: 4 },
  note: { fontSize: 12, color: "#595959", lineHeight: 17 },
});
