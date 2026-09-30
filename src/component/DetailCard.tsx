import { useState } from "react";
import type { TitleDetail } from "../types/media";
import { FavoriteButton } from './FavoriteButton'

type Props = { detail: TitleDetail };

function imageUrl(path: string, size: "w500" | "w185" | "w1280") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function runtimeText(detail: TitleDetail) {
  if (detail.runtimeMinutes === null)
    return detail.runtimeLabel === "per_episode"
      ? "ไม่ระบุความยาวต่อตอน"
      : "ไม่ระบุความยาว";
  const hours = Math.floor(detail.runtimeMinutes / 60);
  const minutes = detail.runtimeMinutes % 60;
  const duration = hours
    ? `${hours} ชม.${minutes ? ` ${minutes} นาที` : ""}`
    : `${minutes} นาที`;
  return detail.runtimeLabel === "per_episode" ? `${duration} / ตอน` : duration;
}

export function DetailCard({ detail }: Props) {
  const [posterFailed, setPosterFailed] = useState(false);
  // const [backdropFailed, setBackdropFailed] = useState(false);
  const [failedCast, setFailedCast] = useState<Record<number, boolean>>({});
  const year = detail.date?.slice(0, 4) || "ไม่ระบุปี";
  const typeLabel = detail.mediaType === "movie" ? "ภาพยนตร์" : "ซีรีส์";
  // const backdrop = detail.backdropPath && !backdropFailed
  //   ? imageUrl(detail.backdropPath, "w1280")
  //   : null;
  const backdrop = detail.backdropPath
  ? imageUrl(detail.backdropPath, "w1280")
  : null;
  const trailer = detail.trailer;
  const trailerEmbed =
    trailer?.site === "YouTube"
      ? `https://www.youtube-nocookie.com/embed/${trailer.key}`
      : trailer?.site === "Vimeo"
        ? `https://player.vimeo.com/video/${trailer.key}`
        : null;

  return (
    <article className="detail-content">
      <section
        className="detail-hero"
        style={
          backdrop
            ? {
                backgroundImage: `linear-gradient(90deg,#0d0e13 8%,#0d0e13d9 50%,#0d0e1399),url("${backdrop}")`,
              }
            : undefined
        }
      >
        <div className="detail-hero-inner">
          <div className="detail-poster">
            {detail.posterPath && !posterFailed ? (
              <img
                src={imageUrl(detail.posterPath, "w500")}
                alt={`โปสเตอร์ ${detail.title}`}
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <div className="detail-poster-empty">ไม่มีโปสเตอร์</div>
            )}
          </div>
          <div className="detail-intro">
            <span className="section-eyebrow">
              {typeLabel.toUpperCase()} / TMDB #{detail.tmdbId}
            </span>
            <h1>{detail.title}</h1>
            <FavoriteButton id={{ mediaType: detail.mediaType, tmdbId: detail.tmdbId }} variant="detail" />
            <div className="detail-facts">
              <span>{year}</span>
              <span>{typeLabel}</span>
              <span>{runtimeText(detail)}</span>
            </div>
            <div className="detail-genres">
              {detail.genres.length ? (
                detail.genres.map((genre) => (
                  <span key={genre.id}>{genre.name}</span>
                ))
              ) : (
                <span>ไม่ระบุแนว</span>
              )}
            </div>
            <div className="detail-score">
              <span>คะแนน TMDB</span>
              <strong>
                {detail.tmdbScore === null
                  ? "—"
                  : `${detail.tmdbScore.toFixed(1)} / 10`}
              </strong>
            </div>
            <p className="detail-overview">
              {detail.overview || "ยังไม่มีเรื่องย่อสำหรับเรื่องนี้"}
            </p>
            {detail.mediaType === "tv" && (
              <p className="detail-episodes">
                {detail.seasonsCount === null
                  ? "ไม่ระบุจำนวนซีซัน"
                  : `${detail.seasonsCount} ซีซัน`}{" "}
                ·{" "}
                {detail.episodesCount === null
                  ? "ไม่ระบุจำนวนตอน"
                  : `${detail.episodesCount} ตอน`}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="detail-sections">
        <section className="detail-section">
          <h2>นักแสดง</h2>
          {detail.cast.length ? (
            <div className="credit-grid">
              {detail.cast.slice(0, 12).map((person) => (
                <div className="credit-card" key={person.tmdbId}>
                  {person.profilePath && !failedCast[person.tmdbId] ? (
                    <img
                      src={imageUrl(person.profilePath, "w185")}
                      alt={`ภาพ ${person.name}`}
                      loading="lazy"
                      onError={() => setFailedCast((prev) => ({ ...prev, [person.tmdbId]: true }))}
                    />
                  ) : (
                    <div className="credit-image-empty" aria-hidden="true">
                      ◯
                    </div>
                  )}
                  <strong>{person.name}</strong>
                  <span>{person.role || "ไม่ระบุบทบาท"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-muted">ยังไม่มีข้อมูลนักแสดง</p>
          )}
        </section>

        <section className="detail-section">
          <h2>ทีมงาน</h2>
          {detail.crew.length ? (
            <div className="crew-list">
              {detail.crew.slice(0, 12).map((person, index) => (
                <div key={`${person.tmdbId}-${person.role}-${index}`}>
                  <strong>{person.name}</strong>
                  <span>{person.role || "ไม่ระบุหน้าที่"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-muted">ยังไม่มีข้อมูลทีมงาน</p>
          )}
        </section>

        {trailer && trailerEmbed && (
          <section className="detail-section">
            <h2>ตัวอย่างภาพยนตร์ / ซีรีส์</h2>
            <div className="trailer-frame">
              <iframe
                src={trailerEmbed}
                title={`ตัวอย่าง ${detail.title}: ${trailer.name}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <a
              className="trailer-link"
              href={trailer.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              เปิดตัวอย่างบน {trailer.site} ↗
            </a>
          </section>
        )}
      </div>
    </article>
  );
}
