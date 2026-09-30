import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { completePasswordReset } from '../api/auth'

function recoveryToken() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('type') === 'recovery' ? params.get('token_hash') : null
  if (params.has('token_hash')) window.history.replaceState(window.history.state, '', window.location.pathname)
  return token
}

export function ResetPasswordView() {
  const [tokenHash] = useState(recoveryToken)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokenHash || pending) return
    if (password !== confirmation) { setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return }
    setPending(true)
    setError('')
    try {
      await completePasswordReset(tokenHash, password)
      window.dispatchEvent(new Event('movie-auth-changed'))
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ตั้งรหัสผ่านไม่สำเร็จ')
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page"><form className="auth-form" onSubmit={submit}>
    <h1>ตั้งรหัสผ่านใหม่</h1>
    {done ? <p role="status">ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
      : !tokenHash ? <p role="alert" className="auth-error">ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง</p>
        : <>
          <label>รหัสผ่านใหม่<input type="password" required minLength={6} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label>ยืนยันรหัสผ่านใหม่<input type="password" required minLength={6} maxLength={128} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</button>
        </>}
    <p><Link to={done ? '/login' : '/forgot-password'}>{done ? 'ไปหน้าเข้าสู่ระบบ' : 'ขอลิงก์ใหม่'}</Link></p>
  </form></main>
}
