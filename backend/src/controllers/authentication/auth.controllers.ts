import type { Request,Response } from "express";
import prisma from  "../../config/prismaconfig.js";
import bcrypt from "bcryptjs";
import Logger from "../../logger.js";
import { generateAccessToken, verifyAccessToken } from "../../utils/jwt.js";

const hashPassword = async (password: string) => {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
};

const getRoleFromEmail = (email: string): "admin" | "student" => {
    const normalized = email.toLowerCase();
    if (normalized.includes("@admin.college.edu")) {
        return "admin";
    }
    if (normalized.includes("@college.edu")) {
        return "student";
    }
    return "student";
};

const resetPasswordTokenExpiryMinutes = 15;

const normalizeEmail = (email: string) => email.trim().toLowerCase();


export const register=async(req:Request,res:Response)=>{
   try{
         const {name,password,email}=req.body;
        const normalizedEmail = normalizeEmail(email);
        const hashedpassword=await hashPassword(password);
        const role = getRoleFromEmail(normalizedEmail);

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

    const newuser=await prisma.user.create({
        data:{
                name: name.trim(),
        password:hashedpassword,
                email: normalizedEmail,
        role
        }
    });

        const token = generateAccessToken({
            id: newuser.id,
            name: newuser.name,
            email: newuser.email,
            role,
        });

    Logger.info("User register successfully",{id:newuser.id});
    return res.status(201).json({
                message:"User registered successfully",
                token,
        user:{
            id:newuser.id,
            name:newuser.name,
            email:newuser.email,
            role:newuser.role,
        },
    });
   }
   catch(error){
    Logger.error("Error registering user", { error });
    return res.status(500).json({message:"Registration failed"});
   }


};

export const login=async(req:Request,res:Response)=>{
    const {email,password}=req.body;
    try{
        const normalizedEmail = normalizeEmail(email);
        const user=await prisma.user.findUnique({
            where:{email:normalizedEmail},
        })
        if(!user){
            Logger.warn("Login attempt with invalid email");
            return res.status(401).json({message:"Invalid credentials"});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            Logger.warn("Login attempt with incorrect password");
            return res.status(401).json({message:"Invalid credentials"});
        }
        const token = generateAccessToken({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        });

        Logger.info("User logged in successfully",{id:user.id});
        return res.status(200).json({
            message:"Login successful",
            token,
            role:user.role
        })

    }
    catch(error){
        Logger.error("Error logging in user", { error });
        return res.status(500).json({message:"Login failed"});

    }

};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(200).json({
                message: "If the account exists, a reset link has been sent",
            });
        }

        const expiresIn = `${resetPasswordTokenExpiryMinutes}m`;

        const resetToken = generateAccessToken(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            expiresIn,
        );

        Logger.info("Password reset token generated", { id: user.id });

        if (process.env.NODE_ENV !== "production") {
            return res.status(200).json({
                message: "If the account exists, a reset link has been sent",
                resetToken,
            });
        }

        return res.status(200).json({
            message: "If the account exists, a reset link has been sent",
        });
    } catch (error) {
        Logger.error("Error in forgot password", { error });
        return res.status(500).json({ message: "Failed to process forgot password" });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Reset token is required" });
        }

        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({ where: { id: payload.id } });

        if (!user) {
            return res.status(400).json({ message: "Reset token is invalid or expired" });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
            },
        });

        return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        Logger.error("Error resetting password", { error });
        return res.status(500).json({ message: "Password reset failed" });
    }
};

export const me = async (req: Request, res: Response) => {
    return res.status(200).json({
        message: "Authenticated user",
        user: req.user,
    });
};

export const adminProtectedExample = async (_req: Request, res: Response) => {
    return res.status(200).json({ message: "Admin protected route accessed" });
};

export const studentProtectedExample = async (_req: Request, res: Response) => {
    return res.status(200).json({ message: "Student protected route accessed" });
};