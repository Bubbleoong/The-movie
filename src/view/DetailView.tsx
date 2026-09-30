import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiClientError } from "../api/client";
import { getTitleDetail } from "../api/titles";
import { DetailCard } from "../component/DetailCard";
import { ReviewPanel } from './ReviewPanel'
import type { TitleDetail } from "../types/media";
import type { MediaType } from "../types/media";

export function DetailView({ mediaType }: { mediaType: MediaType }) {
  const { tmdbId } = useParams<"tmdbId">();
  return (
    <DetailContent
      key={`${mediaType}-${tmdbId}`}
      mediaType={mediaType}
      tmdbId={tmdbId}
    />
  );
}

function DetailContent({
  mediaType,
  tmdbId,
}: {
  mediaType: MediaType;
  tmdbId: string | undefined;
}) {
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [status, setStatus] = useState<
    "loading" | "success" | "not-found" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const validId =
    tmdbId && /^[1-9]\d*$/.test(tmdbId) && Number.isSafeInteger(Number(tmdbId));

  useEffect(() => {
    if (!validId) return;
    let active = true;
    getTitleDetail(mediaType, Number(tmdbId))
      .then((result) => {
        if (!active) return;
        setDetail(result);
        setStatus("success");
      })
      .catch((cause) => {
        if (!active) return;
        setDetail(null);
        setStatus(
          cause instanceof ApiClientError && cause.status === 404
            ? "not-found"
            : "error",
        );
        setError(
          cause instanceof Error ? cause.message : "โหลดรายละเอียดไม่สำเร็จ",
        );
      });
    return () => {
      active = false;
    };
  }, [mediaType, tmdbId, validId, attempt]);

  if (!validId)
    return (
      <main className="detail-state">
        <h1>รหัสเรื่องไม่ถูกต้อง</h1>
        <p>กรุณาเลือกเรื่องจากรายการอีกครั้ง</p>
        <Link to="/">กลับหน้าแรก</Link>
      </main>
    );
  if (status === "loading")
    return (
      <main className="detail-state" role="status">
        กำลังโหลดรายละเอียด...
      </main>
    );
  if (status === "not-found")
    return (
      <main className="detail-state">
        <h1>ไม่พบเรื่องนี้</h1>
        <p>
          ไม่พบข้อมูล {mediaType === "movie" ? "ภาพยนตร์" : "ซีรีส์"} หมายเลข{" "}
          {tmdbId} ใน TMDB
        </p>
        <Link to="/">กลับหน้าแรก</Link>
      </main>
    );
  if (status === "error")
    return (
      <main className="detail-state" role="alert">
        <h1>โหลดรายละเอียดไม่สำเร็จ</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
        >
          ลองอีกครั้ง
        </button>
      </main>
    );
  return detail ? (
    <main>
      <DetailCard detail={detail} />
      <ReviewPanel id={{ mediaType: detail.mediaType, tmdbId: detail.tmdbId }} />
    </main>
  ) : null;
}
