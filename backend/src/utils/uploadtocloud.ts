import cloudinary from "../config/cloudinary.js";
import {Readable} from "stream";
import Logger from "../logger.js";

type ResourceType = "image" | "video" | "raw" | "auto";

export const uploadBuffer = (
    buffer: Buffer, 
    folder: string, 
    resourceType: ResourceType = "auto"
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Log configuration status (without exposing secrets)
        const config = cloudinary.config();
        Logger.info("Cloudinary config check", {
            hasCloudName: !!config.cloud_name,
            hasApiKey: !!config.api_key,
            hasApiSecret: !!config.api_secret,
            folder,
            resourceType,
        });

        const stream = cloudinary.uploader.upload_stream(
            { 
                folder,
                resource_type: resourceType,
                // For PDFs, ensure they're accessible
                access_mode: "public",
            },
            (err, result) => {
                if (err) {
                    Logger.error("Cloudinary upload stream error", { 
                        error: err.message,
                        code: err.http_code,
                        name: err.name
                    });
                    reject(err);
                } else {
                    Logger.info("Cloudinary upload success", { url: result?.secure_url });
                    resolve(result?.secure_url || "");
                }
            }
        );

        Readable.from(buffer).pipe(stream);
    });
};