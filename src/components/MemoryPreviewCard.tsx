import React from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Memory } from "../types/memory";

type Props = {
  memory: Memory;
  onClose: () => void;
  onDelete: () => void;
};

export default function MemoryPreviewCard({ memory, onClose, onDelete }: Props) {
  function handleDeletePress() {
    Alert.alert(
      "Xóa kỷ niệm?",
      "Kỷ niệm và ảnh đính kèm sẽ bị xóa vĩnh viễn, không thể hoàn tác.",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: onDelete },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleDeletePress}
          style={styles.actionBtn}
          hitSlop={8}
          accessibilityLabel="Xóa kỷ niệm"
        >
          <Ionicons name="trash-outline" size={16} color="#595959" />
        </Pressable>
        <Pressable
          onPress={onClose}
          style={styles.actionBtn}
          hitSlop={8}
          accessibilityLabel="Đóng"
        >
          <Ionicons name="close" size={16} color="#595959" />
        </Pressable>
      </View>
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
  actionRow: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 12,
    zIndex: 1,
  },
  actionBtn: {},
  row: { flexDirection: "row", gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  textCol: { flex: 1, marginLeft: 10 },
  place: { fontSize: 14, fontWeight: "500" },
  date: { fontSize: 11, color: "#595959", marginBottom: 4 },
  note: { fontSize: 12, color: "#595959", lineHeight: 17 },
});
