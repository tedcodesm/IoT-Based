import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: {
      type: String,
      required: true,
    },
       Verified:{
        type:String,
        default:"",
    },
    otp:{
        type:String,
        default:"",
    },
    role: {
      type: String,
      enum: ["parent", "driver", "admin"],
      default: "parent",
    },
    deviceTokens: { type: [String], default: [] },
    pickupLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    pickupEnabled: { type: Boolean, default: false },
    pickupRadius: { type: Number, default: 50 }, // meters
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", userSchema);
