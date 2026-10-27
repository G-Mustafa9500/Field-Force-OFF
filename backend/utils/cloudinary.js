const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadBase64 = async (base64String, folder) => {
  const result = await cloudinary.uploader.upload(base64String, {
    folder:        `field-force/${folder}`,
    resource_type: "image",
    quality:       "auto",
    fetch_format:  "auto"
  });
  return result.secure_url;
};

module.exports = { uploadBase64 };
