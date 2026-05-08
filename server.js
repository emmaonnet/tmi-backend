// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const app = express();


// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());


// ================= CREATE UPLOAD FOLDER =================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


// ================= CLOUDINARY CONFIG =================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});


// ================= MONGODB CONNECTION =================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => {
  console.error("MongoDB error:", err);
  process.exit(1);
});


// ================= MEDIA MODEL =================
const MediaSchema = new mongoose.Schema({
  type: String,
  src: String,
  title: String,
  preacher: String,
  date: String,
  created: { type: Date, default: Date.now }
});

const Media = mongoose.model("Media", MediaSchema);


// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


// ================= ROUTES =================

// ROOT
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});


// 🔹 UPLOAD TO CLOUDINARY
app.post("/upload", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "church-media"
    });

    // delete temp file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});


// 🔹 ADD MEDIA / SERMON
app.post("/media", async (req, res) => {
  try {

    const { type, src, title, preacher, date } = req.body;

    if (!type || !src) {
      return res.status(400).json({ error: "Type and src required" });
    }

    const media = new Media({
      type,
      src,
      title,
      preacher,
      date
    });

    await media.save();

    res.status(201).json(media);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save media" });
  }
});


// 🔹 GET MEDIA
app.get("/media", async (req, res) => {
  try {
    const media = await Media.find().sort({ created: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});


// 🔹 DELETE MEDIA
app.delete("/media/:id", async (req, res) => {
  try {

    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Not found" });
    }

    await Media.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});


// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


















