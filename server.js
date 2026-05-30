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

// ======================================================
// 🔥 SOCKET.IO FIXED (RENDER STABLE VERSION)
// ======================================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true
});

// Socket debugging (important for production)
io.engine.on("connection_error", (err) => {
  console.log("Socket Engine Error:", err.code, err.message);
});

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
// ===================== BROADCAST STATE ================
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

  // immediate sync on connect
  socket.emit("program-update", broadcastState);

  // TAKE LIVE
  socket.on("take-live", (videoId) => {
    broadcastState.program = {
      platform: "youtube",
      id: videoId
    };

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

  // EMERGENCY
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
