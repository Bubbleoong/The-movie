export type MediaType = 'movie' | 'tv'
export type CatalogCategory = 'movie' | 'series' | 'animation'
export type MediaId = { mediaType: MediaType; tmdbId: number }

export type TitleSummary = MediaId & {
  title: string
  date: string | null
  posterPath: string | null
  backdropPath: string | null
  tmdbScore: number | null
  overview: string | null
}

export type PersonCredit = {
  tmdbId: number
  name: string
  role: string | null
  profilePath: string | null
}

export type Trailer = {
  site: 'YouTube' | 'Vimeo'
  key: string
  name: string
  url: string
} | null

export type TitleDetail = TitleSummary & {
  genres: { id: number; name: string }[]
  runtimeMinutes: number | null
  runtimeLabel: 'movie' | 'per_episode'
  cast: PersonCredit[]
  crew: PersonCredit[]
  trailer: Trailer
  seasonsCount: number | null
  episodesCount: number | null
}

export type Favorite = MediaId & { createdAt: string }
export type Review = MediaId & {
  id: string
  authorId: string
  rating: number
  body: string
  createdAt: string
  updatedAt: string
  isMine: boolean
  canDelete: boolean
}
export type ReviewSummary = { average: number | null; count: number }
