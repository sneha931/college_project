import { parseResume as llmParseResume } from "../utils/parseResume.js";
import { uploadBuffer } from "../utils/uploadtocloud.js";
import prisma from "../config/prismaconfig.js";
import Logger from "../logger.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openaiClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export interface ParsedResumeData {
  name: string;
  placementEmail: string;
  skills: string[];
  education: string;
  experience: number;
  marks10: number;
  marks12: number | null;
  diplomaMarks: number | null;
  btechCGPA: number;
}

export interface ResumeUploadResult {
  resumeUrl: string;
  parsedData: ParsedResumeData;
}

/**
 * Extract text from PDF buffer using PDF.js
 */
export const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    Logger.info("PDF loaded", { numPages: pdfDocument.numPages });

    const textParts: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ("str" in item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .join(" ");
      textParts.push(pageText);
    }

    const extractedText = textParts.join("\n");
    Logger.info("PDF text extraction completed", {
      textLength: extractedText.length,
    });

    return extractedText;
  } catch (error) {
    Logger.error("PDF extraction failed", { error });
    throw new Error("Failed to extract text from PDF");
  }
};

/**
 * Extract text from image buffer using OpenAI Vision API (OCR)
 */
export const extractTextFromImage = async (
  buffer: Buffer,
  mimeType: string,
): Promise<string> => {
  try {
    const base64Image = buffer.toString("base64");
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENROUTER_MODEL_ID || "openai/gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this resume image. Return only the raw text content, no formatting or explanations.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const extractedText = response.choices[0]?.message?.content || "";
    Logger.info("OCR text extraction completed", {
      textLength: extractedText.length,
    });

    return extractedText;
  } catch (error) {
    Logger.error("OCR extraction failed", { error });
    throw new Error("Failed to extract text from image");
  }
};

/**
 * Parse numeric value safely
 */
const parseNumeric = (value: string | undefined | null): number | null => {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

/**
 * Validate and normalize experience (in months)
 */
const normalizeExperience = (rawExperience: string | undefined): number => {
  const experienceMatch = rawExperience?.match(/(\d+)/);
  let experienceValue = experienceMatch?.[1]
    ? parseInt(experienceMatch[1], 10)
    : 0;

  // Validate experience is reasonable (0-600 months = 0-50 years)
  if (experienceValue > 600) {
    experienceValue = 0;
  }

  return experienceValue;
};

/**
 * Process and upload resume, extract structured data using LLM
 */
export const processAndParseResume = async (
  file: Express.Multer.File,
): Promise<ResumeUploadResult> => {
  const fileMimeType = file.mimetype || "";

  // Step 1: Upload to Cloudinary
  let resumeUrl: string;
  try {
    const resourceType = fileMimeType === "application/pdf" ? "raw" : "image";
    resumeUrl = await uploadBuffer(file.buffer, "resumes", resourceType);
    Logger.info("Resume uploaded to Cloudinary", { url: resumeUrl });
  } catch (error) {
    Logger.error("Cloudinary upload failed", { error });
    throw new Error("Failed to upload resume to cloud storage");
  }

  // Step 2: Extract text based on file type
  let resumeText: string;
  if (fileMimeType.startsWith("image/")) {
    resumeText = await extractTextFromImage(file.buffer, fileMimeType);
  } else if (fileMimeType === "application/pdf") {
    resumeText = await extractTextFromPDF(file.buffer);

    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error(
        "Could not extract text from PDF. The PDF might be image-based.",
      );
    }
  } else {
    throw new Error(
      "Unsupported file type. Please upload an image or PDF file.",
    );
  }

  // Step 3: Send to LLM for parsing
  const extractedData = await llmParseResume(resumeText);
  Logger.info("LLM parsing completed", { extractedData });

  // Step 4: Normalize and validate data
  const parsedData: ParsedResumeData = {
    name: extractedData.name || "",
    placementEmail: extractedData.placementEmail || "",
    skills: extractedData.skills || [],
    education: extractedData.education || "",
    experience: normalizeExperience(extractedData.experience),
    marks10: parseNumeric(extractedData.marks10) ?? 0,
    marks12: parseNumeric(extractedData.marks12),
    diplomaMarks: parseNumeric(extractedData.diplomaMarks),
    btechCGPA: parseNumeric(extractedData.btechCGPA) ?? 0,
  };

  return {
    resumeUrl,
    parsedData,
  };
};

/**
 * Save parsed resume data to StudentProfile
 */
export const saveResumeToProfile = async (
  userId: string,
  userEmail: string,
  resumeUrl: string,
  parsedData: ParsedResumeData,
) => {
  // Validate and resolve placement email
  let placementEmail = parsedData.placementEmail || userEmail;

  const existingProfileWithEmail = await prisma.studentProfile.findUnique({
    where: { placementEmail },
  });

  // If email is used by another user, fall back to user's email
  if (existingProfileWithEmail && existingProfileWithEmail.userId !== userId) {
    Logger.warn("Placement email conflict, using fallback", {
      extractedEmail: placementEmail,
      fallbackEmail: userEmail,
    });
    placementEmail = userEmail;

    const fallbackEmailProfile = await prisma.studentProfile.findUnique({
      where: { placementEmail },
    });

    if (fallbackEmailProfile && fallbackEmailProfile.userId !== userId) {
      placementEmail = `${userId}@placement.local`;
    }
  }

  // Upsert profile with parsed data
  const profile = await prisma.studentProfile.upsert({
    where: { userId },
    update: {
      name: parsedData.name,
      placementEmail,
      experience: parsedData.experience,
      resumeUrl,
      skills: parsedData.skills,
      marks10: parsedData.marks10,
      marks12: parsedData.marks12,
      diplomaMarks: parsedData.diplomaMarks,
      btechCGPA: parsedData.btechCGPA,
    },
    create: {
      userId,
      name: parsedData.name,
      placementEmail,
      profilePic: "",
      experience: parsedData.experience,
      resumeUrl,
      skills: parsedData.skills,
      marks10: parsedData.marks10,
      marks12: parsedData.marks12,
      diplomaMarks: parsedData.diplomaMarks,
      btechCGPA: parsedData.btechCGPA,
    },
  });

  Logger.info("Resume data saved to profile", { userId });
  return profile;
};
