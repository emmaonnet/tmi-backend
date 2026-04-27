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


// ================= CREATE UPLOADS FOLDER =================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


// ================= MONGODB CONNECTION =================
mongoose.connect("process.env.mongodb+srv://emmaonnet_db_user:Emma2s1984@cluster0.ces893e.mongodb.net/?appName=Cluster0")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));


// ================= MEDIA MODEL =================
const MediaSchema = new mongoose.Schema({
  type: String,
  src: String,
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

// 🔹 UPLOAD IMAGE
app.post("/upload", upload.single("file"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    url: `http://localhost:5000/uploads/${req.file.filename}`
  });
});


// 🔹 ADD MEDIA (SAVE TO DB)
app.post("/media", async (req, res) => {
  try {

    const { type, src } = req.body;

    if (!type || !src) {
      return res.status(400).json({ error: "Type and src are required" });
    }

    const newMedia = new Media({ type, src });
    await newMedia.save();

    res.status(201).json({
      message: "Media saved successfully",
      data: newMedia
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});


// 🔹 GET ALL MEDIA
app.get("/media", async (req, res) => {
  try {

    const media = await Media.find().sort({ created: -1 });
    res.json(media);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});


// 🔹 DELETE MEDIA + IMAGE FILE
app.delete("/media/:id", async (req, res) => {
  try {

    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // delete image file if it's an uploaded image
    if (media.type === "image"&& media.src.includes("/uploads/")) {

      const filePath = path.join(__dirname, media.src.replace("http://localhost:5000/", ""));

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Media.findByIdAndDelete(req.params.id);

    res.json({ message: "Media deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Delete failed" });
  }
});


// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
