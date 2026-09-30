import { Link } from "react-router";
import type { TitleSummary } from "../types/media";
import { TitleCard } from "./TitleCard";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  viewAllPath: string;
  items: TitleSummary[];
  status: "loading" | "success" | "error";
  error: string | null;
  onRetry: () => void;
};

export function TitleShelf({
  eyebrow,
  title,
  description,
  viewAllPath,
  items,
  status,
  error,
  onRetry,
}: Props) {
  return (
    <section className="title-shelf" aria-label={title}>
      <div className="shelf-heading">
        <div>
          <span className="section-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link className="view-all" to={viewAllPath}>
          ดูทั้งหมด <span aria-hidden="true">→</span>
        </Link>
      </div>
      {status === "loading" && (
        <div className="shelf-state" role="status">
          กำลังโหลด{title}...
        </div>
      )}
      {status === "error" && (
        <div className="shelf-state error-state" role="alert">
          <p>{error ?? "โหลดข้อมูลไม่สำเร็จ"}</p>
          <button type="button" onClick={onRetry}>
            ลองอีกครั้ง
          </button>
        </div>
      )}
      {status === "success" &&
        (items.length > 0 ? (
          <div className="card-rail">
            {items.map((item) => (
              <TitleCard
                key={`${item.mediaType}-${item.tmdbId}`}
                title={item}
              />
            ))}
          </div>
        ) : (
          <div className="shelf-state">ยังไม่มีรายการในหมวดนี้</div>
        ))}
    </section>
  );
}
