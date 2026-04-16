import type { Request,Response ,NextFunction} from "express";
import Logger from "../logger.js";
import {type JwtUserPayload, verifyAccessToken}  from "../utils/jwt.js";
import dotenv from "dotenv";
dotenv.config();


declare global {
  namespace Express {
    interface Request {
      user: JwtUserPayload;
    }
  }
}


export const verifytoken=(req:Request,res:Response,next:NextFunction)=>{
      let token:string|undefined;
    
      const authHeader= req.headers.authorization;
      if(authHeader && typeof authHeader === 'string' && authHeader.startsWith("Bearer")){
        token=authHeader.split(" ")[1];
      }
      if(!token){
        Logger.error("No token provided");
        return res.status(401).json({message:"No token provided"});

      }
      try{
        const decoded=verifyAccessToken(token);
        req.user=decoded;
        next();
        


      }
      catch(error){
        Logger.error("Invalid token", { error });
        return res.status(403).json({message:"Invalid or expired token"});
      }

}

export const verifyToken = verifytoken;


