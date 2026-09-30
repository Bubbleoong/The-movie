import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { searchTitles } from "../api/titles";
import { TitleGrid } from "../component/TitleGrid";

function SearchResults({ query }: { query: string }) {
  const load = useCallback(
    (page: number) => searchTitles(query, page),
    [query],
  );
  return (
    <TitleGrid load={load} emptyMessage={`ไม่พบผลลัพธ์สำหรับ “${query}”`} />
  );
}

export function SearchView() {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  return (
    <main className="listing-page">
      <header className="listing-header">
        <span className="section-eyebrow">DISCOVER / SEARCH</span>
        <h1>ผลการค้นหา</h1>
        <p>
          {query ? (
            <>
              คำค้น: <strong>“{query}”</strong>
            </>
          ) : (
            "พิมพ์ชื่อเรื่องในช่องค้นหาด้านบนเพื่อเริ่มค้นหา"
          )}
        </p>
      </header>
      {query ? (
        <SearchResults key={query} query={query} />
      ) : (
        <div className="listing-state">กรุณาระบุคำค้นหา</div>
      )}
    </main>
  );
}
