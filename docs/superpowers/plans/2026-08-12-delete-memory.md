# Delete Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user delete a memory (row + associated Storage photos) from `MemoryPreviewCard` (tapped on the map) and from a long-pressed row in `TimelineScreen`, with a confirmation prompt and immediate UI removal.

**Architecture:** Add a `deleteMemory(memory: Memory): Promise<boolean>` function to the shared `useMemories()` hook — it deletes the Supabase row (required to succeed), best-effort cleans up the row's Storage photos by parsing their public URLs back into bucket paths, then removes the item from the hook's local `data` state so the UI updates immediately without waiting for a refocus refetch. `MemoryPreviewCard` gains a trash-icon button that shows a native confirm `Alert` before calling a new `onDelete` prop; `MapScreen` wires that prop to `deleteMemory` and closes the card on success. `TimelineScreen` wraps each row in a `Pressable` with `onLongPress` triggering the same confirm-then-delete flow.

**Tech Stack:** Expo SDK 51, React Native 0.74.5, `@supabase/supabase-js` ^2.45.0, TypeScript (strict mode).

## Global Constraints

- Spec: [docs/superpowers/specs/2026-08-12-delete-memory-design.md](../specs/2026-08-12-delete-memory-design.md)
- No test runner exists in this project — do not add one. Per-task verification is `npx tsc --noEmit` plus manual on-device testing via Expo Go (which requires a live Supabase project with the `delete` RLS policies from the spec applied — no task in this plan can run that SQL itself).
- Out of scope: bulk delete, undo, deleting from `StatsScreen`, adding any UI beyond what's specified below.
- `src/screens/StatsScreen.tsx`, `src/screens/NewMemoryScreen.tsx`, `src/utils/mapRegion.ts` are not modified by this plan.
- A delete action must always show a native confirm `Alert` first ("Xóa kỷ niệm?" / "Kỷ niệm và ảnh đính kèm sẽ bị xóa vĩnh viễn, không thể hoàn tác.", buttons "Huỷ" (cancel) and "Xóa" (destructive)) before calling `deleteMemory`.
- On successful delete: no additional success `Alert` — the item disappearing from the screen is the feedback. On failure: show an error `Alert` and leave the item in place.
- A double-tap/long-press-twice on the same delete action must not trigger two deletes — guard with a `useRef` flag at the call site (the same pattern `NewMemoryScreen.tsx` already uses for `isSavingRef`/`isPickingRef`), not component state alone.
- Keep all user-facing strings in Vietnamese, matching existing screens.
- `tsconfig.json` has `"strict": true` — all new/changed code must type-check clean under strict mode.

---

### Task 1: Add `deleteMemory` to the shared `useMemories` hook

**Files:**
- Modify: `src/hooks/useMemories.ts`

**Interfaces:**
- Produces: `deleteMemory(memory: Memory): Promise<boolean>`, added to `useMemories()`'s return value alongside the existing `{ data, loading, error }`. Resolves `true` on success (row deleted, local `data` updated), `false` on failure (an `Alert` was already shown, `data` untouched). Consumed by Task 2 (`MapScreen`) and Task 3 (`TimelineScreen`).

- [ ] **Step 1: Add `deleteMemory` and its storage-path helper**

Replace the full contents of `src/hooks/useMemories.ts`:

```typescript
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { Memory } from "../types/memory";

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function extractStoragePath(url: string): string | null {
  const marker = "/memory-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export function useMemories() {
  const [data, setData] = useState<Memory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // useFocusEffect below wraps load() in useCallback(..., []), so the closure
  // is created once at mount and never recreated - a direct read of `data`
  // state inside it would always see the initial (null) value, even after
  // later fetches populate it. Mirror the latest data via a ref so the
  // first-load check below reflects live state instead of a stale closure.
  const dataRef = useRef<Memory[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        if (dataRef.current === null) setLoading(true);
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

          const mapped = (rows ?? []).map((row) => ({
            id: row.id,
            place: row.place,
            date: formatDate(row.memory_date),
            note: row.note,
            color: row.color,
            latitude: row.latitude,
            longitude: row.longitude,
            photos: row.photos ?? [],
          }));
          dataRef.current = mapped;
          setData(mapped);
        } catch (err) {
          console.error("[useMemories] fetch failed:", err);
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

  async function deleteMemory(memory: Memory): Promise<boolean> {
    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", memory.id);

    if (deleteError) {
      console.error("[useMemories] delete failed:", deleteError);
      Alert.alert("Không xóa được kỷ niệm", "Đã có lỗi xảy ra, thử lại.");
      return false;
    }

    if (memory.photos.length > 0) {
      const paths = memory.photos
        .map(extractStoragePath)
        .filter((path): path is string => path !== null);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("memory-photos")
          .remove(paths);
        if (storageError) {
          console.error("[useMemories] storage cleanup failed:", storageError);
        }
      }
    }

    const updated = (dataRef.current ?? []).filter((m) => m.id !== memory.id);
    dataRef.current = updated;
    setData(updated);
    return true;
  }

  return { data, loading, error, deleteMemory };
}
```

Note: the `deleteError` path returns `false` without touching `data`/`dataRef` at all — the item stays visible on screen exactly as before, matching the spec's "giữ nguyên item trên danh sách" requirement. The Storage cleanup failure path only logs — it never blocks the local-state removal, since the row delete (the operation the user actually asked for) already succeeded.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMemories.ts
git commit -m "Add deleteMemory to useMemories: delete row, clean up Storage photos, update local state"
```

---

### Task 2: Delete from the map's preview card

**Files:**
- Modify: `src/components/MemoryPreviewCard.tsx`
- Modify: `src/screens/MapScreen.tsx`

**Interfaces:**
- Consumes: `deleteMemory` from `useMemories()` (Task 1).
- Produces: `MemoryPreviewCard`'s prop type becomes `{ memory: Memory; onClose: () => void; onDelete: () => void }` — the `onDelete` prop takes no arguments; the caller already has the relevant `Memory` in scope (`selected` in `MapScreen`) and doesn't need it echoed back.

- [ ] **Step 1: Add a delete button + confirm dialog to `MemoryPreviewCard`**

Replace the full contents of `src/components/MemoryPreviewCard.tsx`:

```tsx
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
```

Note: the old single `closeBtn` (positioned `top: 8, right: 8`) is replaced by `actionRow`, a horizontal row at the same position holding both the trash and close buttons side by side (`gap: 12`), so the close button ends up in the same visual corner as before with the trash button to its left.

- [ ] **Step 2: Wire `onDelete` in `MapScreen`, with a re-entrancy guard**

In `src/screens/MapScreen.tsx`:

Change the import line:
```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
```
(unchanged — `useRef` is already imported)

Change the hook destructure from:
```tsx
  const { data: memories, loading, error } = useMemories();
```
to:
```tsx
  const { data: memories, loading, error, deleteMemory } = useMemories();
```

Add a new ref and handler function right after the existing `const [showsUserLocation, setShowsUserLocation] = useState(false);` line:
```tsx
  const isDeletingRef = useRef(false);

  async function handleDeleteSelected() {
    if (!selected) return;
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    const success = await deleteMemory(selected);
    isDeletingRef.current = false;
    if (success) {
      setSelected(null);
    }
  }
```

Finally, change the `MemoryPreviewCard` usage from:
```tsx
        {selected && (
          <MemoryPreviewCard memory={selected} onClose={() => setSelected(null)} />
        )}
```
to:
```tsx
        {selected && (
          <MemoryPreviewCard
            memory={selected}
            onClose={() => setSelected(null)}
            onDelete={handleDeleteSelected}
          />
        )}
```

No other part of `MapScreen.tsx` changes.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 4: Manual verification (requires a live Supabase project with the delete RLS policies from the spec — see spec's SQL)**

This step cannot be executed in an environment without a configured Supabase project and a physical device; if you don't have both, report DONE_WITH_CONCERNS and note that Step 4 is pending human verification, per the report format below. If you do have them:

Run: `npx expo start`, open in Expo Go, go to "Bản đồ", tap a pin.
Expected: preview card shows a trash icon next to the close "x". Tapping it shows a confirm `Alert`. Tapping "Huỷ" dismisses with nothing deleted. Tapping "Xóa" deletes the row (check Supabase Table Editor) and any photos (check Storage), the pin disappears from the map, and the card closes automatically.

- [ ] **Step 5: Commit**

```bash
git add src/components/MemoryPreviewCard.tsx src/screens/MapScreen.tsx
git commit -m "Delete memory from the map's preview card"
```

---

### Task 3: Delete from Timeline via long-press

**Files:**
- Modify: `src/screens/TimelineScreen.tsx`

**Interfaces:**
- Consumes: `deleteMemory` from `useMemories()` (Task 1).

- [ ] **Step 1: Replace `TimelineScreen.tsx` with the long-press-delete version**

Replace the full contents of `src/screens/TimelineScreen.tsx`:

```tsx
import React, { useRef } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from "react-native";
import { Memory } from "../types/memory";
import { useMemories } from "../hooks/useMemories";

function TimelineRow({ item, onLongPress }: { item: Memory; onLongPress: () => void }) {
  return (
    <Pressable onLongPress={onLongPress} style={styles.row}>
      <View style={[styles.thumb, { backgroundColor: item.color }]} />
      <View>
        <Text style={styles.place}>{item.place}</Text>
        <Text style={styles.meta}>
          {item.date} · {item.note}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TimelineScreen() {
  const { data: memories, loading, error, deleteMemory } = useMemories();
  const isDeletingRef = useRef(false);

  function handleLongPress(item: Memory) {
    Alert.alert(
      "Xóa kỷ niệm?",
      "Kỷ niệm và ảnh đính kèm sẽ bị xóa vĩnh viễn, không thể hoàn tác.",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            if (isDeletingRef.current) return;
            isDeletingRef.current = true;
            await deleteMemory(item);
            isDeletingRef.current = false;
          },
        },
      ]
    );
  }

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
          renderItem={({ item }) => (
            <TimelineRow item={item} onLongPress={() => handleLongPress(item)} />
          )}
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
```

Note: `TimelineRow`'s wrapping element changes from a plain `View` to a `Pressable` carrying the same `styles.row` — visually identical (`Pressable` accepts the same layout style props as `View`), but now supports `onLongPress`. The `isDeletingRef` guard lives in the screen component (not per-row) since only one delete can be in flight at a time regardless of which row triggered it.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Manual verification (requires a live Supabase project with the delete RLS policies — see spec's SQL)**

Same environment caveat as Task 2's Step 4 — report DONE_WITH_CONCERNS if unavailable, noting this step is pending. If available:

Run: `npx expo start`, open in Expo Go, go to "Timeline", long-press a row.
Expected: confirm `Alert` appears. "Huỷ" dismisses with nothing deleted. "Xóa" deletes the row (and its photos, if any — check Supabase), the row disappears from the list immediately.

- [ ] **Step 4: Commit**

```bash
git add src/screens/TimelineScreen.tsx
git commit -m "Delete memory from Timeline via long-press"
```
