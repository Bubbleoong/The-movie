import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getAnimationTitles, getPopularTitles } from "../api/titles";
import type { TitlePageResponse } from "../types/media";
import { TitleShelf } from "../component/TitleShelf";
import type { TitleSummary } from "../types/media";

type ShelfState = {
  status: "loading" | "success" | "error";
  items: TitleSummary[];
  error: string | null;
};
const initialState: ShelfState = { status: "loading", items: [], error: null };

function useShelf(load: () => Promise<TitlePageResponse>) {
  const [state, setState] = useState<ShelfState>(initialState);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (active)
          setState({ status: "success", items: result.data, error: null });
      })
      .catch((error) => {
        if (active)
          setState({
            status: "error",
            items: [],
            error:
              error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ",
          });
      });
    return () => {
      active = false;
    };
  }, [load, attempt]);

  function retry() {
    setState(initialState);
    setAttempt((value) => value + 1);
  }

  return { ...state, retry };
}

const loadMovies = () => getPopularTitles("movie");
const loadSeries = () => getPopularTitles("tv");
const loadAnimation = () => getAnimationTitles();

function homeAnimation(items: TitleSummary[]) {
  const movieIds = new Set(
    items
      .filter((item) => item.mediaType === "movie")
      .slice(0, 6)
      .map((item) => item.tmdbId),
  );
  const tvIds = new Set(
    items
      .filter((item) => item.mediaType === "tv")
      .slice(0, 6)
      .map((item) => item.tmdbId),
  );
  return items.filter((item) =>
    item.mediaType === "movie"
      ? movieIds.has(item.tmdbId)
      : tvIds.has(item.tmdbId),
  );
}

export function HomeView() {
  const movies = useShelf(loadMovies);
  const series = useShelf(loadSeries);
  const animation = useShelf(loadAnimation);

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-inner">
          <span className="hero-kicker">
            <span aria-hidden="true">✦</span> DISCOVER YOUR NEXT STORY
          </span>
          <h1>
            ทุกเรื่องราวดี ๆ<br />
            <em>เริ่มต้นที่นี่</em>
          </h1>
          <p>
            สำรวจภาพยนตร์ ซีรีส์ และแอนิเมชันจากทั่วโลก
            ค้นพบเรื่องถัดไปที่คุณจะหลงรัก
          </p>
          <Link className="hero-button" to="/movies">
            สำรวจภาพยนตร์ <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring art-ring-outer" />
          <div className="art-ring art-ring-inner" />
          <span>✦</span>
        </div>
      </section>

      <div className="home-content">
        <div className="content-intro">
          <span className="section-eyebrow">EXPLORE THE COLLECTION</span>
          <h2>เลือกดูเรื่องที่ใช่สำหรับคุณ</h2>
          <p>ข้อมูลจาก TMDB อัปเดตตามรายการที่กำลังได้รับความนิยม</p>
        </div>
        <TitleShelf
          eyebrow="01 / POPULAR MOVIES"
          title="ภาพยนตร์ยอดนิยม"
          description="เรื่องที่คอหนังทั่วโลกกำลังพูดถึง"
          viewAllPath="/movies"
          items={movies.items.slice(0, 12)}
          status={movies.status}
          error={movies.error}
          onRetry={movies.retry}
        />
        <TitleShelf
          eyebrow="02 / POPULAR SERIES"
          title="ซีรีส์ยอดนิยม"
          description="เรื่องยาวที่คุณจะอยากดูต่ออีกตอน"
          viewAllPath="/series"
          items={series.items.slice(0, 12)}
          status={series.status}
          error={series.error}
          onRetry={series.retry}
        />
        <TitleShelf
          eyebrow="03 / ANIMATION"
          title="Anime & Cartoon"
          description="แอนิเมชันทั้งภาพยนตร์และซีรีส์จากทั่วโลก"
          viewAllPath="/animation"
          items={homeAnimation(animation.items)}
          status={animation.status}
          error={animation.error}
          onRetry={animation.retry}
        />
      </div>
    </main>
  );
}
