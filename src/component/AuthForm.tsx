import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { login, signup } from "../api/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requested = params.get("returnTo") ?? "/";
  const returnTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const other = mode === "login" ? "/signup" : "/login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
        window.dispatchEvent(new Event("movie-auth-changed"));
        navigate(returnTo, { replace: true });
      } else {
        const result = await signup(email, password);
        if (result.requiresEmailConfirmation) {
          setMessage("หากอีเมลนี้ยังไม่มีบัญชี ระบบจะส่งลิงก์ยืนยันให้ กรุณาตรวจกล่องจดหมาย หากเคยสมัครแล้วให้เข้าสู่ระบบหรือกดลืมรหัสผ่าน");
        } else {
          window.dispatchEvent(new Event("movie-auth-changed"));
          navigate(returnTo, { replace: true });
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={submit}>
        <h1>{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h1>
        <label>
          อีเมล
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          รหัสผ่าน
          <input
            type="password"
            required
            minLength={6}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={pending}>
          {pending
            ? "กำลังดำเนินการ..."
            : mode === "login"
              ? "เข้าสู่ระบบ"
              : "สมัครสมาชิก"}
        </button>
        {mode === "login" && <p><Link to="/forgot-password">ลืมรหัสผ่าน?</Link></p>}
        <p>
          {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?"}{" "}
          <Link to={`${other}?returnTo=${encodeURIComponent(returnTo)}`}>
            {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Link>
        </p>
      </form>
    </main>
  );
}
