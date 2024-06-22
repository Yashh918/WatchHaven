import { v2 as cloudinary } from "cloudinary"
import { promises as fs } from "fs"
import { apiError } from "./apiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(
            localFilePath
            , {
                resource_type: "auto"
            }
        )

        if (!(response && response.url)) {
            throw new apiError(500, "Failed to upload file on cloudinary")
        }

        await fs.unlink(localFilePath);

        return response;
    } catch (error) {
        await fs.unlink(localFilePath);

        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        throw new apiError(500, "Failed to delete file from cloudinary")
    }
}

export {
    uploadOnCloudinary,
    deleteFromCloudinary
}