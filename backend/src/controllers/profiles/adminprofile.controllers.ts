import prisma from "../../config/prismaconfig.js";
import type { Request, Response } from "express";
import Logger from "../../logger.js";

export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.adminProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (profile) {
      Logger.info("Admin profile fetched successfully", { id: req.user.id });
      return res.status(200).json({
        message: "Admin profile fetched successfully",
        profile,
      });
    }
    // No profile yet: return account name & email so frontend can show add form
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "Admin profile not set",
      profile: null,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    Logger.error("Error fetching admin profile", { error });
    return res.status(500).json({ message: "Failed to fetch admin profile" });
  }
};

export const createOrUpdateAdminProfile = async (req: Request, res: Response) => {
  try {
    const { designation, collegeName } = req.body;

    if (!designation || !collegeName) {
      return res.status(400).json({
        message: "Designation and college name are required",
      });
    }

    // Get name and email from JWT, or fetch from DB if not in token (backward compatibility)
    let name = req.user.name;
    const email = req.user.email;

    // If name is not in JWT (old tokens), fetch from database
    if (!name) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      name = user.name;
    }

    if (!name || !email) {
      return res.status(400).json({
        message: "User name and email are required",
      });
    }

    const profile = await prisma.adminProfile.upsert({
      where: { userId: req.user.id },
      update: {
        name,
        email,
        designation: String(designation).trim(),
        collegeName: String(collegeName).trim(),
      },
      create: {
        userId: req.user.id,
        name,
        email,
        designation: String(designation).trim(),
        collegeName: String(collegeName).trim(),
      },
    });

    Logger.info("Admin profile saved successfully", { id: req.user.id });
    return res.status(200).json({
      message: "Admin profile saved successfully",
      profile,
    });
  } catch (error) {
    Logger.error("Error saving admin profile", { error });
    return res.status(500).json({ message: "Failed to save admin profile" });
  }
};
