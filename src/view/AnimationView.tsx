import { getAnimationTitles } from "../api/titles";
import { CatalogPage } from "../component/CatalogPage";

export function AnimationView() {
  return (
    <CatalogPage
      eyebrow="EXPLORE / 03"
      title="Anime & Cartoon"
      description="แอนิเมชันภาพยนตร์และซีรีส์จากทุกประเทศในรายการเดียว"
      load={getAnimationTitles}
    />
  );
}
