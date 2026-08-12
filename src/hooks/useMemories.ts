import { useCallback, useRef, useState } from "react";
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

  return { data, loading, error };
}
