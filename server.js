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

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===================== DATABASE =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// ===================== CLOUDINARY =====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// ===================== MULTER =====================
const upload = multer({ dest: "uploads/" });

// ===================== HEALTH =====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    time: new Date().toISOString()
  });
});

// ===================== BROADCAST STATE =====================
let broadcastState = {
  program: null,
  preview: null,
  lowerThird: "",
  emergency: false,
  lastUpdate: Date.now()
};

// ===================== SOCKET.IO =====================
io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  socket.emit("program-update", broadcastState);

  socket.on("take-live", (videoId) => {
    broadcastState.program = videoId;
    broadcastState.lastUpdate = Date.now();
    io.emit("program-update", broadcastState);
  });

  socket.on("preview-update", (videoId) => {
    broadcastState.preview = videoId;
    io.emit("preview-update", videoId);
  });

  socket.on("stop-live", () => {
    broadcastState.program = null;
    io.emit("program-stop");
  });

  socket.on("lower-third", (text) => {
    broadcastState.lowerThird = text;
    io.emit("lower-third", text);
  });

  socket.on("emergency", (msg) => {
    broadcastState.emergency = true;
    broadcastState.program = null;
    io.emit("emergency", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ===================== LIVE API =====================
app.get("/api/live", (req, res) => {
  res.json(broadcastState);
});

// ===================== YOUTUBE DETECT LIVE (FIXED) =====================

const CHANNEL_ID = process.env.YT_CHANNEL_ID;
const API_KEY = process.env.YT_API_KEY;

async function detectLive() {
  try {

    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return data.items[0].id.videoId;

  } catch (err) {
    console.log("Detect error:", err);
    return null;
  }
}

// ✅ IMPORTANT: THIS ROUTE MUST EXIST BEFORE "*"
app.get("/api/detect-live", async (req, res) => {

  const videoId = await detectLive();

  broadcastState.preview = videoId;

  io.emit("preview-update", videoId);

  res.json({
    videoId
  });
});

// ===================== SERMONS =====================
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

// ===================== SERMON DELETE =====================
app.delete("/api/sermons/:id", async (req, res) => {
  try {
    await Sermon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Sermon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== SERMON UPDATE =====================
app.put("/api/sermons/:id", async (req, res) => {
  try {
    const updated = await Sermon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== MEDIA =====================
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

// ===================== MEDIA DELETE =====================
app.delete("/api/media/:id", async (req, res) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== MEDIA UPDATE =====================
app.put("/api/media/:id", async (req, res) => {
  try {
    const updated = await Media.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== BLOG =====================
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


  app.put("/api/blogs/:id", async (req, res) => {
  try {

    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      success: true,
      updated
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== BLOG DELETE =====================
app.delete("/api/blogs/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== BLOG UPDATE =====================
app.put("/api/blogs/:id", async (req, res) => {
  try {
    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ===================== ANNOUNCEMENTS =====================
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

// ===================== ANNOUNCEMENT DELETE =====================
app.delete("/api/announcements/:id", async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ANNOUNCEMENT UPDATE =====================
app.put("/api/announcements/:id", async (req, res) => {
  try {
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("PRO BROADCAST SYSTEM V3 MAX RUNNING");
});

// ===================== FRONTEND (MUST BE LAST) =====================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`PRO BROADCAST V3 MAX RUNNING ON ${PORT}`);
});
