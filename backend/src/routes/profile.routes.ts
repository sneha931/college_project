import { Router } from "express";
import { verifytoken } from "../middlewares/authMiddleware.js";
import { authorizedrole } from "../middlewares/roleMiddleware.js";
import {
  uploadResume,
  updateProfile,
  getProfile,
  updateProfileData,
  getResume,
  getAllStudentProfilesForAdmin,
  updateStudentProfileByAdmin,
} from "../controllers/profiles/studentprofile.controllers.js";
import {
  getAdminProfile,
  createOrUpdateAdminProfile,
} from "../controllers/profiles/adminprofile.controllers.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = Router();

// Student profile routes
router.get("/", verifytoken, getProfile);
router.get("/resume", verifytoken, getResume);
router.post("/uploadresume", verifytoken, upload.single("resume"), uploadResume);
router.post(
  "/upload-profile-pic",
  verifytoken,
  upload.single("image"),
  updateProfile
);
router.put("/update", verifytoken, updateProfileData);

// Admin profile routes (name & email from account; add/update designation & college)
router.get(
  "/admin",
  verifytoken,
  authorizedrole("admin"),
  getAdminProfile
);
router.put(
  "/admin",
  verifytoken,
  authorizedrole("admin"),
  createOrUpdateAdminProfile
);

// Admin-only: get all student profiles (for reports / PDF export)
router.get(
  "/admin/students",
  verifytoken,
  authorizedrole("admin"),
  getAllStudentProfilesForAdmin
);

// Admin-only: update a student profile (e.g. isPlaced)
router.put(
  "/admin/students/:id",
  verifytoken,
  authorizedrole("admin"),
  updateStudentProfileByAdmin
);

export default router;