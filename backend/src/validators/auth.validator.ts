import type { NextFunction, Request, Response } from "express";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
};

const sendValidationError = (res: Response, message: string) => {
  return res.status(400).json({ message });
};

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return sendValidationError(res, "Name must be at least 2 characters long");
  }

  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return sendValidationError(res, "A valid email is required");
  }

  if (!password || typeof password !== "string" || !isStrongPassword(password)) {
    return sendValidationError(
      res,
      "Password must be at least 8 characters and include uppercase, lowercase, and a number",
    );
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return sendValidationError(res, "A valid email is required");
  }

  if (!password || typeof password !== "string") {
    return sendValidationError(res, "Password is required");
  }

  next();
};

export const validateForgotPassword = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return sendValidationError(res, "A valid email is required");
  }

  next();
};

export const validateResetPassword = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { newPassword } = req.body;

  if (
    !newPassword ||
    typeof newPassword !== "string" ||
    !isStrongPassword(newPassword)
  ) {
    return sendValidationError(
      res,
      "New password must be at least 8 characters and include uppercase, lowercase, and a number",
    );
  }

  next();
};
