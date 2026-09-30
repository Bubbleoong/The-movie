import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiClientError } from '../api/client'
import type { MediaId } from '../types/media'
import { useFavorites } from '../app/FavoritesProvider'

export function FavoriteButton({ id, variant = 'card' }: { id: MediaId; variant?: 'card' | 'detail' }) {
  const { status, favorites, reload, setFavorite } = useFavorites()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const active = favorites.some(item => item.mediaType === id.mediaType && item.tmdbId === id.tmdbId)
  const label = active ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'

  async function click() {
    if (status === 'loading' || pending) return
    if (status === 'guest') {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    if (status === 'error') { reload(); return }
    setPending(true)
    setError('')
    try {
      await setFavorite(id, !active)
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        window.dispatchEvent(new Event('movie-auth-changed'))
        navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`)
      } else {
        setError(caught instanceof Error ? caught.message : 'จัดการรายการโปรดไม่สำเร็จ')
      }
    } finally {
      setPending(false)
    }
  }

  return <span className={`favorite-control favorite-control-${variant}`}>
    <button type="button" className={`favorite-button${active ? ' is-active' : ''}`} aria-label={label} aria-pressed={active} title={status === 'error' ? 'โหลดรายการโปรดไม่สำเร็จ กดเพื่อลองอีกครั้ง' : label} onClick={click} disabled={status === 'loading' || pending}>
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>{variant === 'detail' && <span>{pending ? 'กำลังบันทึก...' : label}</span>}
    </button>
    {error && <span className="favorite-error" role="alert">{error}</span>}
  </span>
}
