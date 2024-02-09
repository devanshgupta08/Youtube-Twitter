import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryUpload = async (filepath) => {
  try {
    if (!filepath) {
      fs.unlinkSync(filepath);
      return null;
    }
    const response = await cloudinary.uploader.upload(filepath, {
      resource_type: "auto"
    });
    fs.unlinkSync(filepath);
    return response;
  } catch (error) {
    fs.unlinkSync(filepath);
    console.error("Cloudinary error:", error);
    return null;
  }
};

export { cloudinaryUpload };
