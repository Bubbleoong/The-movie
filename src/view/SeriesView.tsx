import { getPopularTitles } from '../api/titles'
import { CatalogPage } from '../component/CatalogPage'

const loadSeries = (page: number) => getPopularTitles('tv', page)

export function SeriesView() {
  return <CatalogPage eyebrow="EXPLORE / 02" title="ซีรีส์ยอดนิยม" description="ติดตามซีรีส์ที่ผู้ชมทั่วโลกกำลังให้ความสนใจ" load={loadSeries} />
}
