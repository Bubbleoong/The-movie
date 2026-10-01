# Middleware

`errorMiddleware.ts` จัดรูปแบบข้อผิดพลาดของ API โดยใช้ `ApiError` จาก `../errors/ApiError.ts`.
`session.ts` จัดการ HttpOnly session cookies, refresh session, ตรวจผู้ใช้ และตรวจ Origin ของคำขอ.
