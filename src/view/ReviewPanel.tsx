import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiClientError } from '../api/client'
import { currentUser } from '../api/auth'
import { deleteMyReview, deleteReview, getMyReview, getReviews, saveReview } from '../api/reviews'
import type { ReviewPage } from '../api/reviews'
import type { MediaId, Review } from '../types/media'

export function ReviewPanel({ id }: { id: MediaId }) {
  const location = useLocation()
  const [userId, setUserId] = useState<string | null>(null)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<ReviewPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const [rating, setRating] = useState(8)
  const [body, setBody] = useState('')

  useEffect(() => {
    let active = true
    const update = () => {
      void currentUser().then(user => { if (active) setUserId(user?.id ?? null) })
        .catch(() => { if (active) setUserId(null) })
    }
    update()
    window.addEventListener('movie-auth-changed', update)
    return () => { active = false; window.removeEventListener('movie-auth-changed', update) }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getReviews(id, page).then(data => { if (active) setResult(data) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'โหลดรีวิวไม่สำเร็จ') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id.mediaType, id.tmdbId, page, revision])

  useEffect(() => {
    let active = true
    if (!userId) { setMyReview(null); setBody(''); return }
    getMyReview(id).then(review => {
      if (!active) return
      setMyReview(review)
      setRating(review?.rating ?? 8)
      setBody(review?.body ?? '')
    }).catch(cause => {
      if (!active) return
      if (cause instanceof ApiClientError && cause.status === 401) setUserId(null)
      else setFormError(cause instanceof Error ? cause.message : 'โหลดรีวิวของคุณไม่สำเร็จ')
    })
    return () => { active = false }
  }, [id.mediaType, id.tmdbId, userId, revision])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const text = body.trim()
    if (!Number.isInteger(rating) || rating < 1 || rating > 10 || text.length < 1 || text.length > 2000) {
      setFormError('คะแนนต้องเป็น 1–10 และข้อความต้องมี 1–2000 ตัวอักษร')
      return
    }
    setPending(true)
    setFormError('')
    try {
      const saved = await saveReview(id, rating, text)
      setMyReview(saved)
      setPage(1)
      setRevision(value => value + 1)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'บันทึกรีวิวไม่สำเร็จ')
    } finally { setPending(false) }
  }

  async function remove(review: Review) {
    if (pending || !window.confirm('ต้องการลบรีวิวนี้ใช่ไหม?')) return
    setPending(true)
    setFormError('')
    try {
      if (review.isMine) await deleteMyReview(id)
      else await deleteReview(id, review.id)
      if (review.isMine) { setMyReview(null); setBody(''); setRating(8) }
      setPage(1)
      setRevision(value => value + 1)
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'ลบรีวิวไม่สำเร็จ')
    } finally { setPending(false) }
  }

  const loginPath = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`
  return <section className="review-panel" aria-label="คะแนนและรีวิวสมาชิก">
    <div className="review-heading"><div><span className="section-eyebrow">COMMUNITY REVIEWS</span><h2>คะแนนและรีวิวจากสมาชิก</h2></div>
      <div className="review-summary"><strong>{result?.summary.average === null || result?.summary.average === undefined ? '—' : `${result.summary.average.toFixed(1)} / 10`}</strong><span>{result?.summary.count ?? 0} รีวิว</span></div>
    </div>
    {userId ? <form className="review-form" onSubmit={submit}>
      <h3>{myReview ? 'แก้ไขรีวิวของคุณ' : 'เขียนรีวิวของคุณ'}</h3>
      <label>คะแนน<select value={rating} onChange={event => setRating(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} / 10</option>)}</select></label>
      <label>ความคิดเห็น<textarea required minLength={1} maxLength={2000} rows={4} value={body} onChange={event => setBody(event.target.value)} placeholder="เล่าความคิดเห็นของคุณเกี่ยวกับเรื่องนี้" /></label>
      <span className="review-count">{body.length}/2000 ตัวอักษร</span>
      {formError && <p role="alert" className="review-error">{formError}</p>}
      <button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก...' : myReview ? 'บันทึกการแก้ไข' : 'โพสต์รีวิว'}</button>
    </form> : <p className="review-login"><Link to={loginPath}>เข้าสู่ระบบ</Link> เพื่อให้คะแนนและเขียนรีวิว</p>}
    {error && <div role="alert" className="review-error">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>ลองอีกครั้ง</button></div>}
    {loading && <p role="status" className="review-muted">กำลังโหลดรีวิว...</p>}
    {!loading && !error && result?.data.length === 0 && <p className="review-muted">ยังไม่มีรีวิวสำหรับเรื่องนี้</p>}
    {!loading && !error && result?.data.map(review => <article className="review-item" key={review.id}>
      <div className="review-item-header"><strong>{review.isMine ? 'รีวิวของคุณ' : 'สมาชิก'}</strong><span>{review.rating} / 10</span></div>
      <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('th-TH')}</time>
      <p>{review.body}</p>
      {review.canDelete && <button type="button" disabled={pending} onClick={() => void remove(review)}>{review.isMine ? 'ลบรีวิวของฉัน' : 'ลบรีวิว (ผู้ดูแล)'}</button>}
    </article>)}
    {!loading && !error && result && result.totalPages > 1 && <div className="review-pagination">
      <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>ก่อนหน้า</button>
      <span>หน้า {page} / {result.totalPages}</span>
      <button type="button" disabled={page >= result.totalPages} onClick={() => setPage(value => value + 1)}>ถัดไป</button>
    </div>}
  </section>
}
