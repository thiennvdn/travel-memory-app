# Photo Picker for NewMemoryScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static placeholder photo box in `NewMemoryScreen` with real camera capture + multi-select photo library picking, showing removable thumbnails for each photo added.

**Architecture:** Add `expo-image-picker` as a dependency and configure its camera/photo-library permission strings in `app.json`, following the same pattern used for `expo-location` in the real-map feature. Rewrite `NewMemoryScreen` to hold a `photos: string[]` array of local URIs in state, render it as a horizontal scroll of thumbnails with per-photo remove buttons plus a trailing "add" tile, and wire the add tile to an action sheet offering camera capture or multi-select library picking — each path requests its own permission just-in-time and appends resulting URIs to the array.

**Tech Stack:** Expo SDK 51, React Native 0.74.5, `expo-image-picker` ~15.0.7, TypeScript.

## Global Constraints

- Spec: [docs/superpowers/specs/2026-08-11-photo-picker-design.md](../specs/2026-08-11-photo-picker-design.md)
- No test runner exists in this project (no jest/testing-library configured) — do not add one. Per-task verification is `npx tsc --noEmit` plus manual on-device testing via Expo Go.
- Out of scope (do not implement): wiring the "Lưu kỷ niệm" (Save) button to persist anything, uploading photos anywhere, image compression/resizing beyond the picker's built-in `quality: 0.8`, a hard cap on photo count, voice/emotion icon logic.
- `MapScreen.tsx`, `MemoryPreviewCard.tsx`, `TimelineScreen.tsx`, `StatsScreen.tsx`, `mockMemories.ts` are not modified by this plan.
- Permission denial on an active user action (tapping "+") must show a brief `Alert` — unlike the passive GPS-centering flow on the map screen, this is not a silent fallback.
- Keep all user-facing strings in Vietnamese, matching existing screens.

---

### Task 1: Add expo-image-picker dependency and configure permissions

**Files:**
- Modify: `package.json`
- Modify: `app.json`

**Interfaces:**
- Produces: `expo-image-picker` available as an npm package for Task 2 to import from.

- [ ] **Step 1: Add the dependency to `package.json`**

In the `"dependencies"` object, add this line immediately after the `"expo"` line (so it groups with the other `expo-*` packages):

```json
    "expo-image-picker": "~15.0.7",
```

- [ ] **Step 2: Add camera/photo-library permission config to `app.json`**

Replace the full contents of `app.json` with:

```json
{
  "expo": {
    "name": "Travel Memory",
    "slug": "travel-memory-app",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "splash": {
      "backgroundColor": "#E6F1FB"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Travel Memory dùng vị trí của bạn để hiện bạn đang ở đâu trên bản đồ kỷ niệm.",
        "NSCameraUsageDescription": "Travel Memory cần quyền camera để bạn chụp ảnh cho kỷ niệm.",
        "NSPhotoLibraryUsageDescription": "Travel Memory cần quyền thư viện ảnh để bạn chọn ảnh cho kỷ niệm."
      }
    },
    "android": {
      "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
    },
    "web": {},
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Travel Memory dùng vị trí của bạn để hiện bạn đang ở đâu trên bản đồ kỷ niệm."
        }
      ],
      [
        "expo-image-picker",
        {
          "cameraPermission": "Travel Memory cần quyền camera để bạn chụp ảnh cho kỷ niệm.",
          "photosPermission": "Travel Memory cần quyền thư viện ảnh để bạn chọn ảnh cho kỷ niệm."
        }
      ]
    ]
  }
}
```

- [ ] **Step 3: Verify `app.json` is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('app.json OK')"`
Expected: prints `app.json OK` with no error.

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: exits 0, `node_modules/expo-image-picker` exists.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "Add expo-image-picker dependency and permission config"
```

---

### Task 2: Multi-photo picker UI and logic in NewMemoryScreen

**Files:**
- Modify: `src/screens/NewMemoryScreen.tsx`

**Interfaces:**
- Consumes: `expo-image-picker`'s `requestCameraPermissionsAsync`, `requestMediaLibraryPermissionsAsync`, `launchCameraAsync`, `launchImageLibraryAsync`, `MediaTypeOptions` (from Task 1).

- [ ] **Step 1: Replace `NewMemoryScreen.tsx` with the photo-picker version**

Replace the full contents of `src/screens/NewMemoryScreen.tsx`:

```tsx
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
```

Note: `photoThumbWrap` has no explicit `position` style — React Native `View`s default to `position: "relative"`, so the absolutely-positioned `removeBtn` child correctly anchors to its own thumbnail rather than the whole screen.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors. In particular, `result.assets` must type-check without a null-check inside the `if (!result.canceled)` branches — `expo-image-picker`'s `ImagePickerResult` is a discriminated union on `canceled`, so this narrows `assets` to a non-null array automatically. If tsc reports `assets` as possibly null/undefined, the installed `expo-image-picker` version's types differ from what this plan assumed — stop and report BLOCKED with the exact tsc error rather than adding a non-null assertion or optional chaining to work around it.

- [ ] **Step 3: Manual on-device test**

Run: `npx expo start`, open in Expo Go on a real device, go to the "Ghi mới" tab.
Expected:
1. Tapping the dashed "+" tile shows an action sheet/alert with "Chụp ảnh" and "Chọn từ thư viện" options.
2. "Chụp ảnh" prompts for camera permission (first time), then opens the camera; after taking a photo, a new thumbnail appears before the "+" tile.
3. Tapping "+" again, "Chọn từ thư viện" prompts for photo library permission (first time), then opens the library picker with multi-select enabled; selecting several photos adds all of them as thumbnails, without removing the photo taken earlier.
4. Tapping the small "x" on any thumbnail removes just that photo; the rest keep their order.
5. With camera permission revoked in device Settings, tapping "+" → "Chụp ảnh" shows an `Alert` ("Cần quyền camera...") instead of crashing or silently doing nothing.

- [ ] **Step 4: Commit**

```bash
git add src/screens/NewMemoryScreen.tsx
git commit -m "Add camera capture and multi-select photo picker to NewMemoryScreen"
```
