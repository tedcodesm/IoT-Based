import cloudinary from "../config/cloudinary.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";

export const uploadProfilePhoto = async (req, res) => {
  try {
    const { profilephoto } = req.body; // Expecting base64 string or remote URL
    const userId = req.user._id; // protectRoute gives you the logged-in user
    console.log("User ID:", userId);

    if (!profilephoto) {
      console.log("No profile photo provided");
      return res.status(400).json({ message: "Please provide an image" });
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilephoto, {
      folder: "profiles",
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });
    console.log("Cloudinary upload response:", uploadResponse);

    const imageUrl = uploadResponse.secure_url;
    console.log("Uploaded image URL:", imageUrl);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log("User found:", user);

    // Find or create profile
    let profile = await Profile.findOne({ user: userId });
    if (profile) {
      profile.profilephoto = imageUrl;
      await profile.save();
      console.log("Profile photo updated", profile);
    } else {
      profile = await Profile.create({ user: userId, profilephoto: imageUrl });
        console.log("Profile created with photo", profile);
    }

    res.status(201).json({ message: "Profile photo updated", profile });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res.status(500).json({ message: error.message });
  }
};
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Fetching profile for user ID:", userId);
 

    // Find profile and populate user info (username, email, etc.)
    const profile = await Profile.findOne({ user: userId })
      .populate("user", "username email phone"); // only bring back selected fields
      console.log("Profile found:", profile);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
