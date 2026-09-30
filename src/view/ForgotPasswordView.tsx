import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { requestPasswordReset } from '../api/auth'

export function ForgotPasswordView() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'ส่งคำขอไม่สำเร็จ')
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page"><form className="auth-form" onSubmit={submit}>
    <h1>ลืมรหัสผ่าน</h1>
    {sent ? <p role="status">หากมีบัญชีสำหรับอีเมลนี้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ กรุณาตรวจกล่องจดหมาย</p> : <>
      <p>กรอกอีเมลที่ใช้สมัครสมาชิกเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
      <label>อีเมล<input type="email" required autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="submit" disabled={pending}>{pending ? 'กำลังส่ง...' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</button>
    </>}
    <p><Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link></p>
  </form></main>
}
