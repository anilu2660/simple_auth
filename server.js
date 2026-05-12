// ============================================================
// AuthVault — server.js
// Node.js + Express + MongoDB Atlas + JWT Auth
// ============================================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files from the same directory
app.use(express.static(path.join(__dirname)));

// ─── MongoDB Atlas Connection ──────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET =
  process.env.JWT_SECRET || "authvault_default_secret_change_me";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅  MongoDB Atlas connected successfully"))
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err.message);
    process.exit(1);
  });

// ─── User Schema & Model ───────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name must be at most 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say",
    },
    age: {
      type: Number,
      min: [1, "Age must be at least 1"],
      max: [120, "Age must be at most 120"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City name too long"],
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Mobile number must be 10 digits"],
    },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

// ─── Helper: Generate JWT ──────────────────────────────────
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

// ─── Helper: Validate Email Format ────────────────────────
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

// ─── ROUTES ───────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AuthVault API is running 🚀" });
});

// ── POST /api/signup ────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, gender, age, city, mobile } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please login.",
      });
    }

    // Create and save new user
    const user = new User({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: password,
      gender:   gender || "Prefer not to say",
      age:      age ? Number(age) : undefined,
      city:     city ? city.trim() : undefined,
      mobile:   mobile ? mobile.trim() : undefined,
    });

    await user.save();

    // Generate JWT
    const token = generateToken(user._id);

    console.log(`✅  New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to AuthVault.",
      token,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        gender: user.gender,
        age:    user.age,
        city:   user.city,
        mobile: user.mobile,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);

    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ── POST /api/login ─────────────────────────────────────────
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with this email. Please sign up.",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    console.log(`✅  User logged in: ${user.email}`);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}! 👋`,
      token,
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        gender:    user.gender,
        age:       user.age,
        city:      user.city,
        mobile:    user.mobile,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ── GET /api/me (protected route example) ──────────────────
app.get("/api/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user });
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
});

// ─── Fallback: Serve main.html ─────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// ─── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  AuthVault server running on http://localhost:${PORT}`);
  console.log(`📖  Open http://localhost:${PORT}/main.html in your browser\n`);
});
