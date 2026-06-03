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

  const mongoose = require("mongoose");

/* =========================
   MEDIA MODEL
========================= */
const MediaSchema = new mongoose.Schema({
  title: String,

  type: {
    type: String,
    enum: ["video", "image"],
    required: true
  },

  imageUrl: String,
  videoUrl: String,
  thumbnail: String,

  category: String,
  featured: { type: Boolean, default: false },

  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },

  comments: [
    {
      name: String,
      message: String,
      date: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

const Media = mongoose.model("Media", MediaSchema);

/* =========================
   GET ALL MEDIA
========================= */
app.get("/api/media", async (req, res) => {
  try {
    const media = await Media.find().sort({ createdAt: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CREATE MEDIA (ADMIN UPLOAD)
========================= */
app.post("/api/media", async (req, res) => {
  try {
    const media = new Media(req.body);
    await media.save();
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   UPDATE MEDIA (ADMIN)
========================= */
app.put("/api/media/:id", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    const updated = await Media.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DELETE MEDIA (ADMIN)
========================= */
app.delete("/api/media/:id", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    await Media.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Media deleted successfully",
      deletedId: req.params.id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   LIKE MEDIA
========================= */
app.post("/api/media/:id/like", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    media.likes += 1;
    await media.save();

    res.json({ likes: media.likes });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   INCREASE VIEWS
========================= */
app.post("/api/media/:id/view", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    media.views += 1;
    await media.save();

    res.json({ views: media.views });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADD COMMENT
========================= */
app.post("/api/media/:id/comment", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    const comment = {
      name: req.body.name,
      message: req.body.message
    };

    media.comments.push(comment);
    await media.save();

    res.json(media.comments);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
    

  // ===================== BLOG =====================

const blogSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  image: String,

  likes: { type: Number, default: 0 },

  comments: [
    {
      name: String,
      message: String,
      date: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

const Blog = mongoose.model("Blog", blogSchema);

// ===================== CREATE BLOG =====================

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
    res.status(500).json({ error: "Failed to create blog" });
  }

});

// ===================== GET BLOGS =====================

app.get("/api/blogs", async (req, res) => {

  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }

});

// ===================== UPDATE BLOG =====================

app.put("/api/blogs/:id", async (req, res) => {

  try {

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        content: req.body.content
      },
      { new: true }
    );

    res.json({ success: true, blog });

  } catch (err) {
    res.status(500).json({ error: "Failed to update blog" });
  }

});

// ===================== DELETE BLOG =====================

app.delete("/api/blogs/:id", async (req, res) => {

  try {

    await Blog.findByIdAndDelete(req.params.id);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Failed to delete blog" });
  }

});

// ===================== LIKE BLOG =====================

app.post("/api/blogs/:id/like", async (req, res) => {

  try {

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    blog.likes = (blog.likes || 0) + 1;

    await blog.save();

    res.json({
      success: true,
      likes: blog.likes
    });

  } catch (err) {
    res.status(500).json({ error: "Like failed" });
  }

});

// ===================== ADD COMMENT =====================

app.post("/api/blogs/:id/comment", async (req, res) => {

  try {

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    blog.comments.push({
      name: req.body.name,
      message: req.body.message
    });

    await blog.save();

    res.json({
      success: true,
      comments: blog.comments
    });

  } catch (err) {
    res.status(500).json({ error: "Comment failed" });
  }

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
