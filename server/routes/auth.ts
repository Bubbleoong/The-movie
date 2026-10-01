import { Router } from 'express'
import { signupController, loginController, logoutController, recoverController, resetPasswordController, meController } from '../controllers/auth.js'

export const authRouter = Router()

authRouter.post("/signup", signupController)
authRouter.post("/login", loginController)
authRouter.post("/logout", logoutController)
authRouter.post("/recover", recoverController)
authRouter.post("/reset-password", resetPasswordController)
authRouter.get("/me", meController)
