import Logger from ".././logger.js";
import type {Request,Response,NextFunction} from "express";

export const authorizedrole=(...roles:string[])=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        if(!req.user || !roles.includes(req.user.role)){
            Logger.warn("Unauthorized access attempt by user with role");
            return res.status(403).json({message:"Access denied"});

        }
        next();
    };

};

export const authorizeRole = authorizedrole;