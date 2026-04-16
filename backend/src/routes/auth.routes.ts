import {Router} from "express";
import {
	adminProtectedExample,
	forgotPassword,
	login,
	me,
	register,
	resetPassword,
	studentProtectedExample,
} from "../controllers/authentication/auth.controllers.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/roleMiddleware.js";
import {
	validateForgotPassword,
	validateLogin,
	validateRegister,
	validateResetPassword,
} from "../validators/auth.validator.js";
const router=Router();

router.post("/register",validateRegister,register);
router.post("/login",validateLogin,login);
router.post("/forgot-password",validateForgotPassword,forgotPassword);
router.post("/reset-password/:token",validateResetPassword,resetPassword);

router.get("/me",verifyToken,me);
router.get("/admin-only",verifyToken,authorizeRole("admin"),adminProtectedExample);
router.get("/student-only",verifyToken,authorizeRole("student"),studentProtectedExample);

export default router;