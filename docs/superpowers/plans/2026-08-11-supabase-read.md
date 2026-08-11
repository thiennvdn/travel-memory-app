# Supabase Schema + Read Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `mockMemories` with real data read from a Supabase `memories` table across `MapScreen`, `TimelineScreen`, and `StatsScreen`, with loading/error handling for the network calls.

**Architecture:** Add `@supabase/supabase-js` and a `src/lib/supabase.ts` client that reads its URL/anon key from `EXPO_PUBLIC_*` environment variables (via a gitignored `.env`, with `.env.example` as the checked-in template) and throws a clear error at startup if they're missing. Introduce a shared `useMemories()` hook (`src/hooks/useMemories.ts`) that fetches all rows once per mount and maps them to the app's `Memory` type (moved to `src/types/memory.ts`), including date formatting. `MapScreen` and `TimelineScreen` consume the hook directly with loading/error text states; `StatsScreen` consumes it only for the "Kỷ niệm đã lưu" count, keeping its other three stats as mock values (moved from `mockMemories.ts` into a renamed `mockStats.ts`).

**Tech Stack:** Expo SDK 51, React Native 0.74.5, `@supabase/supabase-js` ^2.45.0, TypeScript (strict mode).

## Global Constraints

- Spec: [docs/superpowers/specs/2026-08-11-supabase-read-design.md](../specs/2026-08-11-supabase-read-design.md)
- No test runner exists in this project — do not add one. Per-task verification is `npx tsc --noEmit` plus manual on-device testing via Expo Go (which requires a real Supabase project the human sets up — no task in this plan can create or seed a live Supabase project itself; the SQL script is written to the spec for the human to run).
- Out of scope: wiring the "Lưu kỷ niệm" Save button (a separate future plan), uploading photos to Storage, any auth/login screen, a `trips`/`provinces` schema, offline caching, realtime subscriptions, retry-on-error logic.
- The `photos` column exists in the schema (per the spec's SQL) but nothing in this plan reads or writes it — `Memory.photos` is always `[]` after this plan ships, since seeded rows have no photos.
- `NewMemoryScreen.tsx` is not modified by this plan.
- Keep all user-facing strings in Vietnamese, matching existing screens.
- `tsconfig.json` has `"strict": true` — all new code must type-check under strict mode with no `any` beyond what `@supabase/supabase-js`'s own untyped `.select("*")` result already carries.

---

### Task 1: Add Supabase client dependency and environment config

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `src/lib/supabase.ts`

**Interfaces:**
- Produces: `supabase` (a configured `SupabaseClient`) exported from `src/lib/supabase.ts`, for Task 2's hook to import.

- [ ] **Step 1: Add the dependency to `package.json`**

In the `"dependencies"` object, add this line (anywhere in the object is fine, but keep the object's existing entries otherwise unchanged):

```json
    "@supabase/supabase-js": "^2.45.0",
```

- [ ] **Step 2: Add `.env` to `.gitignore`**

Add a new line to the existing `.gitignore` (append, don't remove any existing lines):

```
.env
```

- [ ] **Step 3: Create `.env.example`**

Create `.env.example` at the repo root with exactly this content:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Create the Supabase client module**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Thiếu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Tạo file .env từ .env.example và điền giá trị thật từ Supabase Dashboard."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: exits 0, `node_modules/@supabase/supabase-js` exists.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors. `src/lib/supabase.ts` isn't imported anywhere yet, so this mainly confirms the file itself is syntactically and structurally valid TypeScript under `strict: true`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/lib/supabase.ts
git commit -m "Add Supabase client dependency and environment config"
```

---

### Task 2: Data types, fetch hook, and screen wiring

**Files:**
- Create: `src/types/memory.ts`
- Create: `src/hooks/useMemories.ts`
- Delete: `src/data/mockMemories.ts`
- Create: `src/data/mockStats.ts`
- Modify: `src/screens/MapScreen.tsx`
- Modify: `src/screens/TimelineScreen.tsx`
- Modify: `src/screens/StatsScreen.tsx`
- Modify: `src/components/MemoryPreviewCard.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts` (Task 1).
- Produces: `Memory` type from `src/types/memory.ts` — `{ id: string; place: string; date: string; note: string; color: string; latitude: number; longitude: number; photos: string[] }`. `useMemories()` from `src/hooks/useMemories.ts` returning `{ data: Memory[] | null; loading: boolean; error: string | null }`.

This task must land as one atomic change: `mockMemories.ts` (the old `Memory`/`mockMemories`/`mockStats` source) is deleted and every file that imported from it is updated in the same commit, so the tree keeps compiling.

- [ ] **Step 1: Create the shared `Memory` type**

Create `src/types/memory.ts`:

```typescript
export type Memory = {
  id: string;
  place: string;
  date: string; // dd/mm/yyyy
  note: string;
  color: string;
  latitude: number;
  longitude: number;
  photos: string[];
};
```

- [ ] **Step 2: Replace `mockMemories.ts` with `mockStats.ts`**

Delete `src/data/mockMemories.ts`.

Create `src/data/mockStats.ts`:

```typescript
export const mockStats = {
  provinces: 17,
  trips: 9,
  flightSpots: 5,
};
```

(`memoriesSaved` is intentionally dropped — `StatsScreen` computes it from real data in Step 6.)

- [ ] **Step 3: Create the `useMemories` hook**

Create `src/hooks/useMemories.ts`:

```typescript
import { useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data: rows, error: fetchError } = await supabase
        .from("memories")
        .select("*")
        .order("memory_date", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError("Không tải được dữ liệu, thử lại sau.");
        setLoading(false);
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
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 4: Update `MemoryPreviewCard.tsx`'s import**

In `src/components/MemoryPreviewCard.tsx`, change line 4 from:

```typescript
import { Memory } from "../data/mockMemories";
```

to:

```typescript
import { Memory } from "../types/memory";
```

No other change to this file — it doesn't reference `x`/`y` or anything else affected by this plan.

- [ ] **Step 5: Rewrite `MapScreen.tsx` to use `useMemories`**

Replace the full contents of `src/screens/MapScreen.tsx`:

```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Memory } from "../types/memory";
import { useMemories } from "../hooks/useMemories";
import MemoryPreviewCard from "../components/MemoryPreviewCard";
import { getRegionForCoordinates } from "../utils/mapRegion";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const { data: memories, loading, error } = useMemories();

  const initialRegion = useMemo(
    () => getRegionForCoordinates(memories ?? []),
    [memories]
  );

  useEffect(() => {
    if (!memories) return;
    let cancelled = false;

    async function centerOnUser() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return; // giữ nguyên initialRegion (đã canh vừa khung chứa hết pin)
        }
        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setShowsUserLocation(true);
        mapRef.current?.animateToRegion(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          400
        );
      } catch {
        // Lấy vị trí lỗi -> giữ nguyên initialRegion (fallback âm thầm).
      }
    }

    centerOnUser();
    return () => {
      cancelled = true;
    };
  }, [memories]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bản đồ của bạn</Text>
      <View style={styles.mapArea}>
        {loading && <Text style={styles.statusText}>Đang tải...</Text>}
        {!loading && error && <Text style={styles.statusText}>{error}</Text>}
        {!loading && !error && memories && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={showsUserLocation}
          >
            {memories.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -24.5 }}
                tracksViewChanges={false}
                onPress={() => setSelected(m)}
              >
                <View style={styles.pinWrap}>
                  <View style={[styles.pinCircle, { backgroundColor: m.color }]} />
                  <View style={styles.pinTail} />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        <Pressable style={styles.fab} accessibilityLabel="Thêm kỷ niệm mới">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>

        {selected && (
          <MemoryPreviewCard memory={selected} onClose={() => setSelected(null)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "500", padding: 16 },
  mapArea: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E6F1FB",
  },
  statusText: { flex: 1, textAlign: "center", paddingTop: 24, fontSize: 13, color: "#595959" },
  map: { flex: 1 },
  pinWrap: { alignItems: "center" },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "#fff",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginTop: -2,
  },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});
```

Note: `initialRegion` is now computed with `useMemo` from `memories ?? []` instead of being a module-scope constant — `getRegionForCoordinates` (in `src/utils/mapRegion.ts`, unchanged by this plan) already returns a safe fallback region for an empty array, so this is safe to call before `memories` has loaded. The GPS-centering effect now depends on `[memories]` and bails out early via `if (!memories) return;` so it doesn't run before there's a region to fall back to.

- [ ] **Step 6: Rewrite `TimelineScreen.tsx` to use `useMemories`**

Replace the full contents of `src/screens/TimelineScreen.tsx`:

```tsx
import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Memory } from "../types/memory";
import { useMemories } from "../hooks/useMemories";

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
  const { data: memories, loading, error } = useMemories();

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
          renderItem={({ item }) => <TimelineRow item={item} />}
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

- [ ] **Step 7: Update `StatsScreen.tsx`'s "Kỷ niệm đã lưu" count**

Replace the full contents of `src/screens/StatsScreen.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { mockStats } from "../data/mockStats";
import { useMemories } from "../hooks/useMemories";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { data: memories } = useMemories();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hành trình của bạn</Text>
      <View style={styles.grid}>
        <StatCard label="Tỉnh/thành đã đến" value={mockStats.provinces} />
        <StatCard label="Chuyến đi" value={mockStats.trips} />
        <StatCard label="Điểm bay dù" value={mockStats.flightSpots} />
        <StatCard label="Kỷ niệm đã lưu" value={memories?.length ?? 0} />
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
```

`StatsScreen` intentionally shows no separate loading/error text for the "Kỷ niệm đã lưu" card — while loading or on error it just reads `0` via `memories?.length ?? 0`, per the spec (only `MapScreen`/`TimelineScreen` were required to show loading/error text).

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors. In particular, no leftover imports from `../data/mockMemories` anywhere (that file no longer exists) — if tsc reports a missing-module error, find and fix the stale import rather than recreating the deleted file.

- [ ] **Step 9: Manual verification (requires a live Supabase project — see spec's SQL and `.env` setup)**

This step cannot be executed in an environment without a configured Supabase project and a physical device; if you don't have both, report DONE_WITH_CONCERNS and note that Step 9 is pending human verification, per the report format below. If you do have both:

Run: `npx expo start`, open in Expo Go.
Expected: "Bản đồ" shows the 4 seeded pins at their real coordinates and "Đang tải..." briefly before that; "Timeline" shows the same 4 rows with dd/mm/yyyy dates; "Thống kê" shows "Kỷ niệm đã lưu" = 4 alongside the unchanged mock stats.

- [ ] **Step 10: Commit**

```bash
git add src/types/memory.ts src/hooks/useMemories.ts src/data/mockMemories.ts src/data/mockStats.ts src/screens/MapScreen.tsx src/screens/TimelineScreen.tsx src/screens/StatsScreen.tsx src/components/MemoryPreviewCard.tsx
git commit -m "Wire MapScreen, TimelineScreen, StatsScreen to Supabase via useMemories"
```

Note: `git add` on a deleted file stages the deletion; this is correct here since `src/data/mockMemories.ts` was deleted in Step 2.
