import express from "express";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// JWT secret & Email credentials
const authtoken = process.env.JWT_SECRET;
const emailpass = process.env.EMAIL_PASSWORD;
const verifyemail = process.env.VERIFY_EMAIL;

// Firebase FCM initialization
let fcmInitialized = false;
const initFCM = () => {
  if (fcmInitialized) return;
  const path = process.env.FCM_SERVICE_ACCOUNT_PATH;
  if (!path || !fs.existsSync(path)) {
    console.warn("FCM service account not found. Push disabled.");
    return;
  }
  const serviceAccount = JSON.parse(fs.readFileSync(path, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  fcmInitialized = true;
};

// JWT generator
const generateToken = (userId) =>
  jwt.sign({ userId }, authtoken, { expiresIn: "15d" });

// Email sender
const sendVerificationEmail = async (otp, email, username) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: verifyemail,
        pass: emailpass,
      },
    });
    await transporter.verify();

    const message = `<h1>Hello ${username}</h1>
      <p>Your verification code is <b>${otp}</b> and it expires in 2 minutes.</p>`;

    await transporter.sendMail({
      from: verifyemail,
      to: email,
      subject: "Email Verification",
      html: message,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Error sending verification email");
  }
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password, username, phone, role } = req.body;

    if (!email || !password || !username || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password should be at least 6 characters" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      email,
      username,
      password,
      otp,
      phone,
      role: role || "parent",
    });

    await user.save();
    await sendVerificationEmail(otp, email, username);

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      message: "User registered successfully, please verify your email",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        Verified: user.Verified,
      },
    });
  } catch (error) {
    console.error("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// VERIFY
router.post("/verify", async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User does not exist" });
    }
    if (user.otp !== otp) {
      return res.status(402).json({ message: "Invalid OTP" });
    }

    user.Verified = true;
    user.otp = "";
    await user.save();

    res.status(200).json({ message: "User verified successfully" });
  } catch (error) {
    console.error("Error in verify route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User does not exist" });
    if (!user.Verified)
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);
    res.status(200).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// UPDATE DEVICE TOKEN (FCM)
router.post("/update-device-token", async (req, res) => {
  try {
    initFCM();
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ message: "FCM token is required" });

    const user = await User.findById(req.user.id);
    user.deviceTokens = user.deviceTokens || [];
    if (!user.deviceTokens.includes(token)) {
      user.deviceTokens.push(token);
    }
    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating device token", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
