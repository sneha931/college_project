import prisma from '../../config/prismaconfig.js';
import type { Request, Response } from 'express';
import Logger from '../../logger.js';
import { uploadBuffer } from '../../utils/uploadtocloud.js';
import {
  processAndParseResume,
  saveResumeToProfile,
} from '../../service/resumeParser.service.js';

/**
 * Handle resume upload, parse with LLM, and save to profile
 * Workflow:
 * 1. Upload PDF/image to Cloudinary
 * 2. Extract text (PDF.js for PDF, OpenAI Vision for images)
 * 3. Send text to LLM for structured extraction
 * 4. Save parsed data to StudentProfile
 */
export const uploadResume = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      Logger.warn('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    Logger.info('Resume upload started', {
      mimetype: req.file.mimetype,
      size: req.file.buffer.length,
      originalName: req.file.originalname,
    });

    // Process resume: upload to cloud + extract + parse with LLM
    const { resumeUrl, parsedData } = await processAndParseResume(req.file);

    // Save parsed data to database
    const profile = await saveResumeToProfile(
      req.user.id,
      req.user.email,
      resumeUrl,
      parsedData,
    );

    Logger.info('Resume uploaded and parsed successfully', {
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'Resume uploaded and parsed successfully',
      updatedProfile: profile,
      parsedData,
    });
  } catch (error) {
    Logger.error('Error uploading resume', { error });

    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return res.status(400).json({
          message: 'Email already exists. Please use a different email.',
        });
      }
      return res.status(500).json({
        message: `Failed to upload resume: ${error.message}`,
      });
    }

    return res.status(500).json({ message: 'Failed to upload resume' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      Logger.warn('Profile not found', { id: req.user.id });
      return res.status(404).json({ message: 'Profile not found' });
    }
    Logger.info('Profile fetched successfully', { id: req.user.id });
    return res.status(200).json({
      message: 'Profile fetched successfully',
      profile,
    });
  } catch (error) {
    Logger.error('Error fetching profile', { error });
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export const updateProfileData = async (req: Request, res: Response) => {
  try {
    const {
      name,
      placementEmail,
      experience,
      skills,
      marks10,
      marks12,
      diplomaMarks,
      btechCGPA,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !placementEmail ||
      marks10 === undefined ||
      btechCGPA === undefined
    ) {
      return res
        .status(400)
        .json({
          message: 'Name, email, 10th marks, and B.Tech CGPA are required',
        });
    }

    const updatedProfile = await prisma.studentProfile.upsert({
      where: { userId: req.user.id },
      update: {
        name,
        placementEmail,
        experience: experience ? Number(experience) : 0,
        skills: Array.isArray(skills) ? skills : [],
        marks10: Number(marks10),
        marks12: marks12 ? Number(marks12) : null,
        diplomaMarks: diplomaMarks ? Number(diplomaMarks) : null,
        btechCGPA: Number(btechCGPA),
      },
      create: {
        userId: req.user.id,
        name,
        placementEmail,
        profilePic: '',
        experience: experience ? Number(experience) : 0,
        skills: Array.isArray(skills) ? skills : [],
        marks10: Number(marks10),
        marks12: marks12 ? Number(marks12) : null,
        diplomaMarks: diplomaMarks ? Number(diplomaMarks) : null,
        btechCGPA: Number(btechCGPA),
      },
    });

    Logger.info('Profile data updated successfully', { id: req.user.id });
    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    Logger.error('Error updating profile data', { error });
    return res.status(500).json({ message: 'Failed to update profile data' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      Logger.warn('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Accept any image type for profile picture
    const fileMimeType = req.file.mimetype || '';
    if (!fileMimeType.startsWith('image/')) {
      return res.status(400).json({ message: 'File must be an image' });
    }

    const profilepicurl = await uploadBuffer(req.file.buffer, 'profilepics');

    // Use upsert to create profile if it doesn't exist, or update if it does
    const updatedProfile = await prisma.studentProfile.upsert({
      where: { userId: req.user.id },
      update: {
        profilePic: profilepicurl,
      },
      create: {
        userId: req.user.id,
        name: '', // Will be filled when resume is uploaded
        placementEmail: req.user.email || '',
        profilePic: profilepicurl,
        marks10: 0,
        btechCGPA: 0,
        experience: 0,
        skills: [],
      },
    });

    Logger.info('Profile picture updated successfully', { id: req.user.id });
    return res.status(200).json({
      message: 'Profile picture updated successfully',
      profilepicurl,
      profile: updatedProfile,
    });
  } catch (error) {
    Logger.error('Error updating profile', { error });
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const getResume = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        resumeUrl: true,
        name: true,
      },
    });

    if (!profile) {
      Logger.warn('Profile not found for resume fetch', { id: req.user.id });
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!profile.resumeUrl) {
      Logger.warn('Resume not uploaded', { id: req.user.id });
      return res.status(404).json({ message: 'Resume not uploaded yet' });
    }

    // Use Google Docs Viewer to display PDF inline
    // This works with any public URL including Cloudinary raw files
    const encodedUrl = encodeURIComponent(profile.resumeUrl);
    const viewableUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

    Logger.info('Resume URL fetched successfully', {
      id: req.user.id,
      originalUrl: profile.resumeUrl,
      viewableUrl,
    });
    return res.status(200).json({
      message: 'Resume fetched successfully',
      resumeUrl: viewableUrl,
      originalUrl: profile.resumeUrl, // Also send original URL if needed for download
      name: profile.name,
    });
  } catch (error) {
    Logger.error('Error fetching resume', { error });
    return res.status(500).json({ message: 'Failed to fetch resume' });
  }
};

// Admin-only: fetch all student profiles for report/analytics
export const getAllStudentProfilesForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const profiles = await prisma.studentProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });

    Logger.info('All student profiles fetched for admin', {
      count: profiles.length,
      adminId: req.user.id,
    });

    return res.status(200).json({
      message: 'All student profiles fetched successfully',
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    Logger.error('Error fetching all student profiles for admin', {
      error,
      adminId: req.user.id,
    });
    return res
      .status(500)
      .json({ message: 'Failed to fetch student profiles' });
  }
};

// Admin-only: update a student profile (e.g. isPlaced, name, placementEmail, marks, etc.)
export const updateStudentProfileByAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res
        .status(400)
        .json({ message: 'Student profile ID is required' });
    }

    const {
      isPlaced,
      placedCompany,
      name,
      placementEmail,
      experience,
      skills,
      marks10,
      marks12,
      diplomaMarks,
      btechCGPA,
    } = req.body;

    type UpdatePayload = {
      isPlaced?: boolean;
      placedCompany?: string | null;
      name?: string;
      placementEmail?: string;
      experience?: number;
      skills?: string[];
      marks10?: number;
      marks12?: number | null;
      diplomaMarks?: number | null;
      btechCGPA?: number;
    };
    const updateData: UpdatePayload = {};
    if (typeof isPlaced === 'boolean') updateData.isPlaced = isPlaced;
    if (placedCompany !== undefined) {
      const parsedPlacedCompany = String(placedCompany).trim();
      updateData.placedCompany =
        parsedPlacedCompany.length > 0 ? parsedPlacedCompany : null;
    }
    if (typeof isPlaced === 'boolean' && !isPlaced) {
      updateData.placedCompany = null;
    }
    if (name !== undefined) updateData.name = String(name);
    if (placementEmail !== undefined)
      updateData.placementEmail = String(placementEmail);
    if (experience !== undefined)
      updateData.experience = Number(experience) || 0;
    if (Array.isArray(skills)) updateData.skills = skills;
    if (marks10 !== undefined) updateData.marks10 = Number(marks10);
    if (marks12 !== undefined)
      updateData.marks12 =
        marks12 === null || marks12 === '' ? null : Number(marks12);
    if (diplomaMarks !== undefined)
      updateData.diplomaMarks =
        diplomaMarks === null || diplomaMarks === ''
          ? null
          : Number(diplomaMarks);
    if (btechCGPA !== undefined) updateData.btechCGPA = Number(btechCGPA);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const profile = await prisma.studentProfile.update({
      where: { id },
      data: updateData,
    });

    Logger.info('Student profile updated by admin', {
      studentId: id,
      adminId: req.user.id,
    });
    return res.status(200).json({
      message: 'Student profile updated successfully',
      profile,
    });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    Logger.error('Error updating student profile by admin', {
      error,
      adminId: req.user?.id,
    });
    return res
      .status(500)
      .json({ message: 'Failed to update student profile' });
  }
};
