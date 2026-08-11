import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

// Bước sau: nối expo-av (ghi âm) + lưu vào Supabase Storage khi có backend.
export default function NewMemoryScreen() {
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền camera", "Cấp quyền camera để chụp ảnh cho kỷ niệm.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handlePickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền thư viện ảnh", "Cấp quyền thư viện ảnh để chọn ảnh cho kỷ niệm.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function handleAddPhoto() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Huỷ", "Chụp ảnh", "Chọn từ thư viện"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          if (buttonIndex === 2) handlePickFromLibrary();
        }
      );
    } else {
      Alert.alert("Thêm ảnh", undefined, [
        { text: "Chụp ảnh", onPress: handleTakePhoto },
        { text: "Chọn từ thư viện", onPress: handlePickFromLibrary },
        { text: "Huỷ", style: "cancel" },
      ]);
    }
  }

  function handleRemovePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ghi kỷ niệm mới</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoRow}
        contentContainerStyle={styles.photoRowContent}
      >
        {photos.map((uri) => (
          <View key={uri} style={styles.photoThumbWrap}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <Pressable
              onPress={() => handleRemovePhoto(uri)}
              style={styles.removeBtn}
              hitSlop={8}
              accessibilityLabel="Xoá ảnh"
            >
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addPhotoBox} onPress={handleAddPhoto}>
          <Ionicons name="camera-outline" size={20} color="#888780" />
          <Text style={styles.photoText}>Thêm ảnh</Text>
        </Pressable>
      </ScrollView>

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
  photoRow: { marginBottom: 10 },
  photoRowContent: { gap: 8, paddingRight: 4 },
  photoThumbWrap: { width: 90, height: 90 },
  photoThumb: { width: 90, height: 90, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b4b2a9",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoText: { fontSize: 11, color: "#888780" },
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
