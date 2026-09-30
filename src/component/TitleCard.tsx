import { useState } from "react";
import { Link } from "react-router";
import type { TitleSummary } from "../types/media";
import { FavoriteButton } from './FavoriteButton'

type Props = { title: TitleSummary };

export function TitleCard({ title }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const detailPath = `/${title.mediaType}/${title.tmdbId}`;
  const posterUrl = title.posterPath
    ? `https://image.tmdb.org/t/p/w342${title.posterPath}`
    : null;
  const year = title.date?.slice(0, 4) || "ไม่ระบุปี";

  return (
    <article className="title-card">
      <Link
        className="title-card-link"
        to={detailPath}
        aria-label={`ดูรายละเอียด ${title.title}`}
      >
        <div className="poster-frame">
          {posterUrl && !imageFailed ? (
            <img
              src={posterUrl}
              alt={`โปสเตอร์ ${title.title}`}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="poster-fallback" aria-label="ไม่มีโปสเตอร์">
              <span aria-hidden="true">▣</span>
              <small>ไม่มีโปสเตอร์</small>
            </div>
          )}
          <span className="media-badge">
            {title.mediaType === "movie" ? "MOVIE" : "SERIES"}
          </span>
        </div>
        <div className="card-copy">
          <h3>{title.title}</h3>
          <div className="card-meta">
            <span>{year}</span>
            <span aria-label={`คะแนน TMDB ${title.tmdbScore ?? "ไม่ระบุ"}`}>
              ★ {title.tmdbScore === null ? "—" : title.tmdbScore.toFixed(1)}
            </span>
          </div>
        </div>
      </Link>
      <FavoriteButton id={{ mediaType: title.mediaType, tmdbId: title.tmdbId }} />
    </article>
  );
}
