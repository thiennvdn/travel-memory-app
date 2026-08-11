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
  }, []);

  return { data, loading, error };
}
