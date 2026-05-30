require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ======================================================
// ===================== MIDDLEWARE =====================
// ======================================================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
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
// ===================== FILE DB ========================
// ======================================================
const DB_FILE = "./db.json";

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ======================================================
// ===================== BROADCAST ENGINE ==============
// ======================================================

let broadcastState = {
  program: null,
  preview: null,
  mode: "manual",
  channel: "main",
  emergency: false,
  lowerThird: "",
  schedule: [],
  lastUpdate: Date.now()
};

// ======================================================
// ===================== SOCKET ENGINE ==================
// ======================================================
io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  socket.emit("program-update", broadcastState);

  // TAKE LIVE
  socket.on("take-live", (videoId) => {

    broadcastState.program = videoId;
    broadcastState.lastUpdate = Date.now();

    io.emit("program-update", broadcastState);
  });

  // PREVIEW
  socket.on("preview-update", (videoId) => {

    broadcastState.preview = videoId;

    io.emit("preview-update", videoId);
  });

  // STOP LIVE
  socket.on("stop-live", () => {

    broadcastState.program = null;

    io.emit("program-stop");
  });

  // LOWER THIRD
  socket.on("lower-third", (text) => {

    broadcastState.lowerThird = text;

    io.emit("lower-third", text);
  });

  // EMERGENCY MODE
  socket.on("emergency", (msg) => {

    broadcastState.emergency = true;
    broadcastState.program = null;

    io.emit("emergency", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ======================================================
// ===================== LIVE API =======================
// ======================================================
app.get("/api/live", (req, res) => {
  res.json(broadcastState);
});

app.post("/api/live", (req, res) => {

  broadcastState = {
    ...broadcastState,
    ...req.body,
    lastUpdate: Date.now()
  };

  io.emit("program-update", broadcastState);

  res.json({
    success: true,
    broadcastState
  });
});

// ======================================================
// ===================== DETECT LIVE ====================
// ======================================================
const CHANNEL_ID = process.env.YT_CHANNEL_ID;
const API_KEY = process.env.YT_API_KEY;

async function detectLive() {

  try {

    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return null;

    return data.items[0].id.videoId;

  } catch (err) {
    console.log("Detect error:", err);
    return null;
  }
}

app.get("/api/detect-live", async (req, res) => {

  const videoId = await detectLive();

  broadcastState.preview = videoId;

  io.emit("preview-update", videoId);

  res.json({ videoId });
});

// ======================================================
// ===================== SERMONS ========================
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

app.post("/api/sermons", upload.single("thumbnail"), async (req, res) => {

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
});

app.get("/api/sermons", async (req, res) => {
  res.json(await Sermon.find().sort({ createdAt: -1 }));
});

app.delete("/api/sermons/:id", async (req, res) => {
  await Sermon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ======================================================
// ===================== MEDIA ==========================
// ======================================================
const mediaSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  url: String
}, { timestamps: true });

const Media = mongoose.model("Media", mediaSchema);

app.post("/api/media", upload.single("file"), async (req, res) => {

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
const blogSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  image: String
}, { timestamps: true });

const Blog = mongoose.model("Blog", blogSchema);

app.post("/api/blogs", upload.single("image"), async (req, res) => {

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
});

app.get("/api/blogs", async (req, res) => {
  res.json(await Blog.find().sort({ createdAt: -1 }));
});

// ======================================================
// ===================== ANNOUNCEMENTS ==================
// ======================================================
const announcementSchema = new mongoose.Schema({
  title: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Announcement = mongoose.model("Announcement", announcementSchema);

app.post("/api/announcements", async (req, res) => {
  const a = new Announcement(req.body);
  await a.save();
  res.json({ success: true, a });
});

app.get("/api/announcements", async (req, res) => {
  res.json(await Announcement.find().sort({ date: -1 }));
});

// ======================================================
// ===================== HEALTH =========================
// ======================================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

// ======================================================
// ===================== ROOT ===========================
// ======================================================
app.get("/", (req, res) => {
  res.send("PRO BROADCAST SYSTEM V3 MAX RUNNING");
});

// ======================================================
// ===================== START SERVER ===================
// ======================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`PRO BROADCAST V3 MAX RUNNING ON ${PORT}`);
});
