import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

export type UserRole = "ADMIN" | "STUDENT" | "admin" | "student";

export interface JwtUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export const generateAccessToken = (
  payload: JwtUserPayload,
  expiresIn: SignOptions["expiresIn"] = "1h",
) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtUserPayload;
};