import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiClientError } from '../api/client'
import { addFavorite, getFavorites, removeFavorite } from '../api/favorites'
import type { Favorite, MediaId } from '../types/media'

type Status = 'loading' | 'guest' | 'ready' | 'error'
type FavoritesContextValue = {
  status: Status
  favorites: Favorite[]
  reload: () => void
  setFavorite: (id: MediaId, favorite: boolean) => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('loading')
    getFavorites().then(items => {
      if (!active) return
      setFavorites(items)
      setStatus('ready')
    }).catch(error => {
      if (!active) return
      setFavorites([])
      setStatus(error instanceof ApiClientError && error.status === 401 ? 'guest' : 'error')
    })
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    const update = () => setAttempt(value => value + 1)
    window.addEventListener('movie-auth-changed', update)
    return () => window.removeEventListener('movie-auth-changed', update)
  }, [])

  async function setFavorite(id: MediaId, favorite: boolean) {
    if (favorite) {
      const result = await addFavorite(id)
      setFavorites(previous => previous.some(item => item.mediaType === id.mediaType && item.tmdbId === id.tmdbId)
        ? previous : [...previous, result])
    } else {
      await removeFavorite(id)
      setFavorites(previous => previous.filter(item => item.mediaType !== id.mediaType || item.tmdbId !== id.tmdbId))
    }
  }

  return <FavoritesContext.Provider value={{ status, favorites, reload: () => setAttempt(value => value + 1), setFavorite }}>
    {children}
  </FavoritesContext.Provider>
}

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('FavoritesProvider is missing')
  return value
}
