import { getPopularTitles } from "../api/titles";
import { CatalogPage } from "../component/CatalogPage";

const loadMovies = (page: number) => getPopularTitles("movie", page);

export function MovieView() {
  return (
    <CatalogPage
      eyebrow="EXPLORE / 01"
      title="ภาพยนตร์ยอดนิยม"
      description="ค้นพบภาพยนตร์ที่กำลังได้รับความนิยมจากทั่วโลก"
      load={loadMovies}
    />
  );
}
