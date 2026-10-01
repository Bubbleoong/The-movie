import { ApiError } from '../errors/ApiError.js';
function config() {
    const base = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!base || !key)
        throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า Supabase Auth');
    return { base: base.replace(/\/$/, ''), key };
}
export async function authFetch<T>(path: string, method: string, body?: unknown, accessToken?: string): Promise<T> {
    const { base, key } = config();
    let response: Response;
    try {
        response = await fetch(`${base}/auth/v1${path}`, {
            method,
            headers: {
                apikey: key,
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(10000),
        });
    }
    catch {
        throw new ApiError(502, 'AUTH_UNAVAILABLE', 'ติดต่อระบบสมาชิกไม่ได้');
    }
    if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const code = payload && typeof payload === 'object'
            ? ('error_code' in payload && typeof payload.error_code === 'string' ? payload.error_code
                : 'code' in payload && typeof payload.code === 'string' ? payload.code : 'unknown')
            : 'unknown';
        if (path.startsWith('/recover?')) {
            console.warn('Supabase password recovery failed', { status: response.status, code });
            if (code === 'over_email_send_rate_limit') {
                throw new ApiError(429, 'RECOVERY_EMAIL_LIMIT', 'Supabase จำกัดจำนวนอีเมลที่ส่งได้ กรุณารอให้โควตารายชั่วโมงรีเซ็ตแล้วลองใหม่');
            }
            if (response.status === 429 || code === 'over_request_rate_limit') {
                throw new ApiError(429, 'RECOVERY_RATE_LIMIT', 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่');
            }
            if (code === 'email_address_not_authorized') {
                throw new ApiError(502, 'RECOVERY_EMAIL_RESTRICTED', 'Supabase ยังไม่อนุญาตให้ส่งอีเมลถึงที่อยู่นี้ กรุณาตั้งค่า Custom SMTP หรือใช้บัญชีในทีม Supabase');
            }
            if (response.status >= 500) {
                throw new ApiError(502, 'RECOVERY_DELIVERY_FAILED', 'Supabase ส่งอีเมลกู้คืนไม่สำเร็จ กรุณาตรวจ Auth Logs, เทมเพลต Reset Password และ SMTP');
            }
            throw new ApiError(502, 'RECOVERY_FAILED', 'ส่งอีเมลกู้คืนไม่สำเร็จ กรุณาตรวจการตั้งค่า Supabase Auth');
        }
        if (path === '/token?grant_type=password') {
            if (code === 'invalid_credentials')
                throw new ApiError(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            if (code === 'email_not_confirmed')
                throw new ApiError(403, 'EMAIL_NOT_CONFIRMED', 'ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันจากอีเมลก่อนเข้าสู่ระบบ');
        }
        if (path === '/signup') {
            if (code === 'user_already_exists' || code === 'email_exists')
                throw new ApiError(409, 'ACCOUNT_EXISTS', 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือใช้ลืมรหัสผ่าน');
            if (code === 'weak_password')
                throw new ApiError(400, 'WEAK_PASSWORD', 'รหัสผ่านไม่ผ่านข้อกำหนดของระบบ กรุณาใช้รหัสผ่านที่คาดเดายากขึ้น');
        }
        if (path === '/verify' && code === 'otp_expired')
            throw new ApiError(400, 'RESET_LINK_INVALID', 'ลิงก์ตั้งรหัสผ่านใหม่หมดอายุหรือถูกใช้แล้ว กรุณาขอลิงก์ใหม่');
        if (code === 'bad_jwt' || code === 'invalid_jwt')
            throw new ApiError(401, 'AUTH_INVALID', 'ข้อมูลยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ');
        if (response.status === 400 || response.status === 401 || response.status === 422) {
            throw new ApiError(401, 'AUTH_INVALID', 'ข้อมูลเข้าสู่ระบบไม่ถูกต้องหรือบัญชียังไม่ยืนยันอีเมล');
        }
        throw new ApiError(502, 'AUTH_UNAVAILABLE', 'ระบบสมาชิกไม่พร้อมให้บริการ');
    }
    if (response.status === 204)
        return undefined as T;
    return response.json() as Promise<T>;
}
