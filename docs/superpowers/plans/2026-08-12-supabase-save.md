# Supabase Save Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the "Lưu kỷ niệm" button in `NewMemoryScreen` to actually save a memory — capture the device's current GPS location, upload any selected photos to Supabase Storage, and insert a row into the `memories` table — and fix `useMemories()` so other screens see the new row without an app restart.

**Architecture:** Switch `useMemories()`'s fetch trigger from "once on mount" (`useEffect`) to "every time the screen gains focus" (`useFocusEffect` from `@react-navigation/native`, already a dependency) — this is a self-contained fix in the shared hook that benefits `MapScreen`, `TimelineScreen`, and `StatsScreen` without touching any of them directly. Separately, rewrite `NewMemoryScreen` to add a `handleSave` flow: validate the place field, get GPS coordinates via `expo-location` (already a dependency, same calls `MapScreen` already uses), upload each locally-picked photo to a Supabase Storage bucket via `fetch(uri).blob()` + `.storage.upload()`, pick a random color from the app's existing palette, and insert the row — with per-step error `Alert`s that preserve the form's contents on failure and reset it on success.

**Tech Stack:** Expo SDK 51, React Native 0.74.5, `@supabase/supabase-js` ^2.45.0, `expo-location` ~17.0.1, `@react-navigation/native` ^6.1.17, TypeScript (strict mode).

## Global Constraints

- Spec: [docs/superpowers/specs/2026-08-12-supabase-save-design.md](../specs/2026-08-12-supabase-save-design.md)
- No test runner exists in this project — do not add one. Per-task verification is `npx tsc --noEmit` plus manual on-device testing via Expo Go (which requires a live Supabase project with the `memories` table AND the `memory-photos` Storage bucket + policies from the spec — no task in this plan can create or configure a live Supabase project itself).
- Out of scope: delete functionality (a separate future plan), manual location picking, a color-picker UI, photo compression beyond the picker's existing `quality: 0.8`, a `trips` schema, voice/emotion icon logic, adding a `delete` RLS policy on `memories`/`storage.objects` (the spec's SQL only adds `insert` policies).
- `MapScreen.tsx`, `TimelineScreen.tsx`, `StatsScreen.tsx`, `MemoryPreviewCard.tsx` are not modified by this plan — the refetch fix lives entirely in `useMemories.ts`.
- Keep all user-facing strings in Vietnamese, matching existing screens.
- `tsconfig.json` has `"strict": true` — all new/changed code must type-check clean under strict mode.
- An active user action (tapping "Lưu kỷ niệm") that fails must show a clear `Alert` and preserve the form's entered data — never fail silently, never clear the form on error (only on success).

---

### Task 1: Refetch memories on screen focus

**Files:**
- Modify: `src/hooks/useMemories.ts`

**Interfaces:**
- Produces: same public shape as before — `useMemories()` still returns `{ data: Memory[] | null; loading: boolean; error: string | null }`. Only the internal fetch trigger changes (focus-based instead of mount-only). No consumer (`MapScreen`, `TimelineScreen`, `StatsScreen`) needs to change.

- [ ] **Step 1: Replace the mount-only `useEffect` with `useFocusEffect`**

Replace the full contents of `src/hooks/useMemories.ts`:

```typescript
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { Memory } from "../types/memory";

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function useMemories() {
  const [data, setData] = useState<Memory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError(null);
        try {
          const { data: rows, error: fetchError } = await supabase
            .from("memories")
            .select("*")
            .order("memory_date", { ascending: false });

          if (cancelled) return;

          if (fetchError) {
            setError("Không tải được dữ liệu, thử lại sau.");
            return;
          }

          setData(
            (rows ?? []).map((row) => ({
              id: row.id,
              place: row.place,
              date: formatDate(row.memory_date),
              note: row.note,
              color: row.color,
              latitude: row.latitude,
              longitude: row.longitude,
              photos: row.photos ?? [],
            }))
          );
        } catch {
          if (!cancelled) setError("Không tải được dữ liệu, thử lại sau.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return { data, loading, error };
}
```

Note: `useFocusEffect`'s callback must be wrapped in `useCallback` with an empty dependency array (per `@react-navigation/native`'s own documented pattern) so react-navigation doesn't treat it as a new effect on every render — otherwise it would re-run the fetch on every re-render, not just on focus. The `cancelled` flag and its cleanup function work exactly as before: react-navigation calls the returned cleanup when the screen blurs, mirroring how the old `useEffect`'s cleanup ran on unmount.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMemories.ts
git commit -m "Refetch memories on screen focus instead of only on mount"
```

---

### Task 2: Wire the Save button — GPS, photo upload, insert

**Files:**
- Modify: `src/screens/NewMemoryScreen.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts` (existing). `Location.requestForegroundPermissionsAsync`/`getCurrentPositionAsync` from `expo-location` (existing dependency, same calls already used in `src/screens/MapScreen.tsx`).

- [ ] **Step 1: Replace `NewMemoryScreen.tsx` with the save-wired version**

Replace the full contents of `src/screens/NewMemoryScreen.tsx`:

```tsx
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
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${Date.now()}-${index}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("memory-photos")
    .upload(path, blob);
  if (uploadError) {
    throw uploadError;
  }
  const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAllPhotos(uris: string[]): Promise<string[] | null> {
  try {
    return await Promise.all(uris.map((uri, index) => uploadPhoto(uri, index)));
  } catch {
    Alert.alert("Không upload được ảnh", "Đã có lỗi xảy ra, thử lại.");
    return null;
  }
}

async function getCurrentPosition(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Cần quyền vị trí", "Cần quyền vị trí để lưu kỷ niệm.");
      return null;
    }
    return await Location.getCurrentPositionAsync({});
  } catch {
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
    } catch {
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
    } catch {
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
    if (saving) return;
    if (place.trim() === "") {
      Alert.alert("Thiếu địa điểm", "Nhập địa điểm trước khi lưu.");
      return;
    }

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
        Alert.alert("Không lưu được kỷ niệm", "Đã có lỗi xảy ra, thử lại.");
        return;
      }

      Alert.alert("Đã lưu kỷ niệm!");
      setPlace("");
      setNote("");
      setPhotos([]);
    } catch {
      Alert.alert("Không lưu được kỷ niệm", "Đã có lỗi xảy ra, thử lại.");
    } finally {
      setSaving(false);
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
```

Notes on this design, for the implementer's context (not steps to perform):
- `uploadPhoto`, `uploadAllPhotos`, `getCurrentPosition`, `todayIsoDate`, and `PIN_COLORS` are module-level (outside the component) since none of them close over component state — keeps the component body focused on orchestration.
- `getCurrentPosition` and `uploadAllPhotos` each show their own specific `Alert` internally and return `null` on failure; `handleSave` checks for `null` and returns early without a redundant second alert. The insert step is checked explicitly (`insertError`) since `supabase-js` resolves with an `{error}` field rather than throwing for ordinary request failures. The outer `try`/`catch` around the whole flow is a safety net for anything unexpected (e.g., an actual thrown exception from the insert call) — its `Alert` reuses the "Không lưu được kỷ niệm" message since by that point in the flow, location and photos have already succeeded.
- The `finally` block always runs `setSaving(false)`, regardless of which step failed or succeeded, so the button is never left permanently stuck on "Đang lưu...".
- `fetch(uri).blob()` is the standard way to read a local `file://` URI into a `Blob` in Expo/React Native for passing to `supabase.storage.upload()`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors. Pay particular attention to the `supabase.storage.from(...).upload(path, blob)` call — if `tsc` reports a type mismatch between React Native's `Blob` and the `FileBody` type `@supabase/storage-js` expects, STOP and report BLOCKED with the exact error rather than working around it with a type assertion — this plan assumes it type-checks cleanly based on Supabase's own documented Expo pattern, and a mismatch would mean that assumption needs revisiting, not silently suppressing.

- [ ] **Step 3: Manual verification (requires a live Supabase project with the spec's Storage bucket + policies — see spec's SQL and `.env` setup)**

This step cannot be executed in an environment without a configured Supabase project, Storage bucket, and a physical device with GPS/camera; if you don't have all three, report DONE_WITH_CONCERNS and note that Step 3 is pending human verification, per the report format below. If you do have them:

Run: `npx expo start`, open in Expo Go, go to "Ghi mới".
Expected:
1. Bấm "Lưu kỷ niệm" với ô "Địa điểm" trống → `Alert` báo thiếu địa điểm, không lưu.
2. Nhập địa điểm + ghi chú, bấm Lưu → cấp quyền vị trí nếu được hỏi → nút hiện "Đang lưu..." → sau đó `Alert` "Đã lưu kỷ niệm!", form xoá trắng.
3. Chuyển tab "Bản đồ"/"Timeline"/"Thống kê" → thấy kỷ niệm mới ngay (nhờ Task 1's refetch-on-focus fix).
4. Lặp lại với ảnh đính kèm (chụp + chọn từ thư viện) → lưu thành công, ảnh lên đúng bucket `memory-photos` (kiểm tra qua Supabase Dashboard → Storage).
5. Tắt Wi-Fi, thử Lưu → `Alert` báo lỗi, dữ liệu đã nhập (địa điểm/ghi chú/ảnh) vẫn còn nguyên trên form.
6. Thu hồi quyền vị trí trong Settings điện thoại, thử Lưu → `Alert` báo cần quyền vị trí, không lưu, không crash. Cấp lại quyền sau khi test.

- [ ] **Step 4: Commit**

```bash
git add src/screens/NewMemoryScreen.tsx
git commit -m "Wire Save button: GPS capture, photo upload, insert into Supabase"
```
