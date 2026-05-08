require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ================= CLOUDINARY =================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// ================= CLOUDINARY STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "testimony-missions",
    resource_type: "auto"
  })
});

const upload = multer({ storage });

// ================= MODELS =================
const sermonSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  duration: String,
  videoUrl: String,
  thumbnail: String
}, { timestamps: true });

const Sermon = mongoose.model("Sermon", sermonSchema);

// ================= ROUTES =================

// ROOT
app.get("/", (req, res) => {
  res.send("Testimony Missions Backend Running");
});

// UPLOAD SERMON
app.post("/api/sermons", upload.single("thumbnail"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Thumbnail required" });

    const sermon = new Sermon({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      duration: req.body.duration,
      videoUrl: req.body.videoUrl,
      thumbnail: req.file.path
    });

    await sermon.save();

    res.json({ success: true, sermon });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET SERMONS
app.get("/api/sermons", async (req, res) => {
  try {
    const sermons = await Sermon.find().sort({ createdAt: -1 });
    res.json(sermons);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
