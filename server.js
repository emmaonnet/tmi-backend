// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();


// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// serve uploaded images
app.use("/uploads", express.static("uploads"));


// ================= CREATE UPLOAD FOLDER =================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


// ================= MONGODB CONNECTION =================
mongoose.connect("process.env.mongodb+srv://emmaonnet_db_user:Emma2s1984@cluster0.ces893e.mongodb.net/?appName=Cluster0")
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
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });


// ================= ROUTES =================

// 🔹 ROOT
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});


// 🔹 UPLOAD IMAGE
app.post("/upload", upload.single("file"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
  });
});


// 🔹 ADD MEDIA / SERMON
app.post("/media", async (req, res) => {
  try {

    const { type, src, title, preacher, date } = req.body;

    if (!type || !src) {
      return res.status(400).json({ error: "Type and src are required" });
    }

    const newMedia = new Media({
      type,
      src,
      title,
      preacher,
      date
    });

    await newMedia.save();

    res.status(201).json(newMedia);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save media" });
  }
});


// 🔹 GET ALL MEDIA
app.get("/media", async (req, res) => {
  try {
    const media = await Media.find().sort({ created: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});


// 🔹 DELETE MEDIA + FILE
app.delete("/media/:id", async (req, res) => {
  try {

    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // delete uploaded image file if exists
    if (media.type === "image"&& media.src.includes("/uploads/")) {

      const filePath = path.join(
        __dirname,
        media.src.replace(`${req.protocol}://${req.get("host")}/`, "")
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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
