import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Bước sau: nối expo-image-picker (chọn ảnh) + expo-av (ghi âm) + lưu vào Supabase Storage.
export default function NewMemoryScreen() {
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ghi kỷ niệm mới</Text>

      <Pressable style={styles.photoBox}>
        <Ionicons name="camera-outline" size={20} color="#888780" />
        <Text style={styles.photoText}>Thêm ảnh / dấu vết</Text>
      </Pressable>

      <TextInput
        placeholder="Địa điểm"
        value={place}
        onChangeText={setPlace}
        style={styles.input}
      />
      <TextInput
        placeholder="Bạn nhớ gì về nơi này..."
        value={note}
        onChangeText={setNote}
        multiline
        style={[styles.input, styles.textarea]}
      />

      <View style={styles.iconRow}>
        <Ionicons name="mic-outline" size={18} color="#595959" />
        <Ionicons name="happy-outline" size={18} color="#595959" style={{ marginLeft: 12 }} />
      </View>

      <Pressable style={styles.saveBtn}>
        <Text style={styles.saveText}>Lưu kỷ niệm</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  photoBox: {
    height: 90,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b4b2a9",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 10,
  },
  photoText: { fontSize: 12, color: "#888780" },
  input: {
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  textarea: { height: 70, textAlignVertical: "top" },
  iconRow: { flexDirection: "row", marginBottom: 12 },
  saveBtn: {
    backgroundColor: "#111",
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "500" },
});
