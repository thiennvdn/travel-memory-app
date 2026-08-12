import React, { useRef, useState } from "react";
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
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

const PIN_COLORS = ["#1D9E75", "#D85A30", "#BA7517", "#7F77DD"];

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function uploadPhoto(uri: string, index: number): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${Date.now()}-${index}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("memory-photos")
    .upload(path, decode(base64), { contentType: "image/jpeg" });
  if (uploadError) {
    throw uploadError;
  }
  const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAllPhotos(uris: string[]): Promise<string[] | null> {
  try {
    return await Promise.all(uris.map((uri, index) => uploadPhoto(uri, index)));
  } catch (err) {
    console.error("[NewMemoryScreen] upload failed:", err);
    Alert.alert("Không upload được ảnh", "Đã có lỗi xảy ra, thử lại.");
    return null;
  }
}

async function getCurrentPosition(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.error("[NewMemoryScreen] location permission denied");
      Alert.alert("Cần quyền vị trí", "Cần quyền vị trí để lưu kỷ niệm.");
      return null;
    }
    return await Location.getCurrentPositionAsync({});
  } catch (err) {
    console.error("[NewMemoryScreen] get location failed:", err);
    Alert.alert("Cần quyền vị trí", "Cần quyền vị trí để lưu kỷ niệm.");
    return null;
  }
}

// Bước sau: nối expo-av (ghi âm) khi cần.
export default function NewMemoryScreen() {
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isPickingRef = useRef(false);
  const isSavingRef = useRef(false);

  async function handleTakePhoto() {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Cần quyền camera", "Cấp quyền camera để chụp ảnh cho kỷ niệm.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.error("[NewMemoryScreen] take photo failed:", err);
      Alert.alert("Không thể chụp ảnh", "Đã có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      isPickingRef.current = false;
    }
  }

  async function handlePickFromLibrary() {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
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
    } catch (err) {
      console.error("[NewMemoryScreen] pick photo failed:", err);
      Alert.alert("Không thể chọn ảnh", "Đã có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      isPickingRef.current = false;
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

  async function handleSave() {
    if (isSavingRef.current) return;
    if (place.trim() === "") {
      Alert.alert("Thiếu địa điểm", "Nhập địa điểm trước khi lưu.");
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      const position = await getCurrentPosition();
      if (!position) return;

      const photoUrls = await uploadAllPhotos(photos);
      if (!photoUrls) return;

      const color = PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)];

      const { error: insertError } = await supabase.from("memories").insert({
        place: place.trim(),
        note,
        color,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        photos: photoUrls,
        memory_date: todayIsoDate(),
      });

      if (insertError) {
        console.error("[NewMemoryScreen] insert failed:", insertError);
        Alert.alert("Không lưu được kỷ niệm", "Đã có lỗi xảy ra, thử lại.");
        return;
      }

      Alert.alert("Đã lưu kỷ niệm!");
      setPlace("");
      setNote("");
      setPhotos([]);
    } catch (err) {
      console.error("[NewMemoryScreen] save failed:", err);
      Alert.alert("Không lưu được kỷ niệm", "Đã có lỗi xảy ra, thử lại.");
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
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

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? "Đang lưu..." : "Lưu kỷ niệm"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  photoRow: { flexGrow: 0, marginBottom: 10 },
  photoRowContent: { gap: 8, paddingRight: 4, paddingTop: 8 },
  photoThumbWrap: { width: 90, height: 90 },
  photoThumb: { width: 90, height: 90, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: 2,
    right: 2,
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
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "500" },
});
