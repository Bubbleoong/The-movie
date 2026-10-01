import { useEffect, useState } from "react";
import type { TitlePageResponse } from "../types/media";
import type { TitleSummary } from "../types/media";
import { TitleCard } from "./TitleCard";

type Props = {
  load: (page: number) => Promise<TitlePageResponse>;
  emptyMessage: string;
};

export function TitleGrid({ load, emptyMessage }: Props) {
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load(page)
      .then((result) => {
        if (!active) return;
        setItems((previous) =>
          page === 1 ? result.data : [...previous, ...result.data],
        );
        setHasMore(result.hasMore);
        setStatus("success");
        setError(null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ",
        );
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [load, page, attempt]);

  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }
  function loadMore() {
    setStatus("loading");
    setPage((value) => value + 1);
  }

  return (
    <section className="listing-results" aria-label="รายการเรื่อง">
      {items.length > 0 && (
        <div className="card-grid">
          {items.map((item) => (
            <TitleCard key={`${item.mediaType}-${item.tmdbId}`} title={item} />
          ))}
        </div>
      )}
      {status === "loading" && (
        <div className="listing-state" role="status">
          กำลังโหลดรายการ...
        </div>
      )}
      {status === "error" && (
        <div className="listing-state error-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            ลองอีกครั้ง
          </button>
        </div>
      )}
      {status === "success" && items.length === 0 && !hasMore && (
        <div className="listing-state">{emptyMessage}</div>
      )}
      {status === "success" && hasMore && (
        <div className="listing-actions">
          <button type="button" onClick={loadMore}>
            โหลดเพิ่มเติม <span aria-hidden="true">↓</span>
          </button>
        </div>
      )}
    </section>
  );
}
