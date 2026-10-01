import type { TitlePageResponse } from "../types/media";
import { TitleGrid } from "./TitleGrid";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  load: (page: number) => Promise<TitlePageResponse>;
};

export function CatalogPage({ eyebrow, title, description, load }: Props) {
  return (
    <main className="listing-page">
      <header className="listing-header">
        <span className="section-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <TitleGrid load={load} emptyMessage="ยังไม่มีรายการในหมวดนี้" />
    </main>
  );
}
