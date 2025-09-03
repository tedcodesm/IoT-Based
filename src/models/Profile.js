import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  profilephoto: { type: String, required: true },
},{timestamps: true});

const Profile = mongoose.model("Profile", ProfileSchema);

export default Profile;
