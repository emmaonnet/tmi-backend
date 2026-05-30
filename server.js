require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ======================================================
// ===================== MIDDLEWARE =====================
// ======================================================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// ===================== DATABASE =======================
// ======================================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// ======================================================
// ===================== CLOUDINARY =====================
// ======================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// ======================================================
// ===================== MULTER =========================
// ======================================================
const upload = multer({ dest: "uploads/" });

// ======================================================
// ===================== SIMPLE FILE DB =================
// ======================================================
const DB_FILE = "./db.json";

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ======================================================
// ===================== MODELS =========================
// ======================================================
const sermonSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  duration: String,
  videoUrl: String,
  thumbnail: String
}, { timestamps: true });

const Sermon = mongoose.model("Sermon", sermonSchema);

const mediaSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: { type: String, enum: ["image", "video"] },
  url: String
}, { timestamps: true });

const Media = mongoose.model("Media", mediaSchema);

const blogSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  image: String
}, { timestamps: true });

const Blog = mongoose.model("Blog", blogSchema);

const announcementSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Announcement = mongoose.model("Announcement", announcementSchema);

// ======================================================
// ===================== HOME STATE =====================
// ======================================================
app.get("/api/home", (req, res) => {
  res.json(readDB());
});

// ======================================================
// ===================== SERMONS ========================
// ======================================================
app.post("/api/sermons", upload.single("thumbnail"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "sermons"
    });

    const sermon = new Sermon({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      duration: req.body.duration,
      videoUrl: req.body.videoUrl,
      thumbnail: result.secure_url
    });

    await sermon.save();

    res.json({ success: true, sermon });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/sermons", async (req, res) => {
  const data = await Sermon.find().sort({ createdAt: -1 });
  res.json(data);
});

app.delete("/api/sermons/:id", async (req, res) => {
  await Sermon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================================================
// ===================== MEDIA ==========================
// ======================================================
app.post("/api/media", upload.single("file"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "media"
    });

    const media = new Media({
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      url: result.secure_url
    });

    await media.save();

    res.json({ success: true, media });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/media", async (req, res) => {
  res.json(await Media.find().sort({ createdAt: -1 }));
});

app.delete("/api/media/:id", async (req, res) => {
  await Media.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================================================
// ===================== BLOG ===========================
// ======================================================
app.post("/api/blogs", upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "blogs"
    });

    const blog = new Blog({
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      image: result.secure_url
    });

    await blog.save();

    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ error: "Blog upload failed" });
  }
});

app.get("/api/blogs", async (req, res) => {
  res.json(await Blog.find().sort({ createdAt: -1 }));
});

app.delete("/api/blogs/:id", async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================================================
// ===================== ANNOUNCEMENT ===================
// ======================================================
app.post("/api/announcements", async (req, res) => {
  const announcement = new Announcement(req.body);
  await announcement.save();
  res.json({ success: true, announcement });
});

app.get("/api/announcements", async (req, res) => {
  res.json(await Announcement.find().sort({ date: -1 }));
});

// ======================================================
// ===================== LIVE STATE =====================
// ======================================================
let liveState = {
  type: "youtube",
  youtubeId: "",
  facebookUrl: "",
  channel: "main"
};

app.get("/api/live", (req, res) => {
  res.json(liveState);
});

app.post("/api/live", (req, res) => {
  liveState = {
    type: req.body.type || "youtube",
    youtubeId: req.body.youtubeId || "",
    facebookUrl: req.body.facebookUrl || "",
    channel: req.body.channel || "main"
  };

  io.emit("live-update", liveState);

  res.json({ success: true, liveState });
});

// ======================================================
// ===================== SOCKET.IO ======================
// ======================================================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("live-update", liveState);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ======================================================
// ===================== HEALTH =========================
// ======================================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString()
  });
});

// ======================================================
// ===================== ROOT ===========================
// ======================================================
app.get("/", (req, res) => {
  res.send("Server V2 Running Cleanly");
});

// ======================================================
// ===================== START SERVER ===================
// ======================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
