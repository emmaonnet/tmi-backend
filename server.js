require("dotenv").config();






const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;



const path = require("path");

const app = express();





const DB_FILE = "./db.json";

/* READ */
function readDB(){
  return JSON.parse(fs.readFileSync(DB_FILE));
}

/* WRITE */
function writeDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* HOME API */
app.get("/api/home", (req, res) => {
  res.json(readDB());
});

/* UPDATE SERMON */
app.post("/api/sermon", (req, res) => {
  const db = readDB();
  db.sermon = req.body;
  writeDB(db);
  res.json({success:true});
});

/* UPDATE BLOG */
app.post("/api/blog", (req, res) => {
  const db = readDB();
  db.blog = req.body;
  writeDB(db);
  res.json({success:true});
});

/* UPDATE MEDIA */
app.post("/api/media", (req, res) => {
  const db = readDB();
  db.media = req.body;
  writeDB(db);
  res.json({success:true});
});

/* UPDATE ANNOUNCEMENT */
app.post("/api/announcement", (req, res) => {
  const db = readDB();
  db.announcement = req.body;
  writeDB(db);
  res.json({success:true});
});

app.listen(3000, () => {
  console.log("Server running");
});










// ======================================================
// ===================== MIDDLEWARE =====================
// ======================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
extended:true,
limit:"50mb"
}));


// ======================================================
// ===================== STATIC FILES ===================
// ======================================================

app.use(
express.static(
path.join(__dirname, "public")
)
);


// ======================================================
// ===================== MONGODB ========================
// ======================================================

mongoose.connect(
process.env.MONGODB_URI
)
.then(() => {

console.log("MongoDB Connected");

})
.catch((err) => {

console.log("MongoDB Error:", err);

});


// ======================================================
// ===================== CLOUDINARY =====================
// ======================================================

cloudinary.config({

cloud_name:
process.env.CLOUDINARY_NAME,

api_key:
process.env.CLOUDINARY_KEY,

api_secret:
process.env.CLOUDINARY_SECRET

});


// ======================================================
// ===================== MULTER STORAGE =================
// ======================================================





const upload =
multer({
dest:"uploads/"
});



// ======================================================
// ===================== MODELS =========================
// ======================================================


// ================= SERMON MODEL =================

const sermonSchema =
new mongoose.Schema({

title:{
type:String,
required:true
},

description:String,

category:String,

duration:String,

videoUrl:{
type:String,
required:true
},

thumbnail:{
type:String,
required:true
}

},{
timestamps:true
});

const Sermon =
mongoose.model(
"Sermon",
sermonSchema
);



// ================= MEDIA MODEL =================

const mediaSchema =
new mongoose.Schema({

title:{
type:String,
required:true
},

description:String,

type:{
type:String,
enum:["image","video"],
required:true
},

url:{
type:String,
required:true
}

},{
timestamps:true
});

const Media =
mongoose.model(
"Media",
mediaSchema
);





// ======================================================
// ===================== ROOT ===========================
// ======================================================

app.get("/", (req, res) => {

res.send(
"Testimony Missions Backend Running"
);

});




// ======================================================
// ===================== SERMON ROUTES ==================
// ======================================================


// ---------- UPLOAD SERMON ----------

app.post(
"/api/sermons",
upload.single("thumbnail"),
async (req, res) => {

try{

const result =
await cloudinary.uploader.upload(
req.file.path,
{
folder:"testimony-sermons"
}
);

const sermon =
new Sermon({

title:req.body.title,

description:req.body.description,

category:req.body.category,

duration:req.body.duration,

videoUrl:req.body.videoUrl,

thumbnail:result.secure_url

});

await sermon.save();

res.json({

success:true,

message:"Sermon uploaded",

sermon

});

}catch(error){

console.log(error);

res.status(500).json({
error:"Upload failed"
});

}

});




// ---------- GET ALL SERMONS ----------

app.get(
"/api/sermons",
async (req, res) => {

try{

const sermons =
await Sermon.find()
.sort({ createdAt:-1 });

res.json(sermons);

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to fetch sermons"

});

}

});




// ---------- DELETE SERMON ----------

app.delete(
"/api/sermons/:id",
async (req, res) => {

try{

await Sermon.findByIdAndDelete(
req.params.id
);

res.json({

success:true,

message:"Sermon deleted"

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Delete failed"

});

}

});




// ======================================================
// ===================== MEDIA ROUTES ===================
// ======================================================


// ---------- UPLOAD MEDIA ----------

app.post(
"/api/media",

upload.single("file"),

async(req,res)=>{

try{

if(!req.file){

return res.status(400).json({
error:"No file uploaded"
});

}


/* CLOUDINARY */

const result =
await cloudinary.uploader.upload(
req.file.path,
{
resource_type:"auto",
folder:"media"
}
);


/* SAVE TO DATABASE */

const media =
new Media({

title:req.body.title,

description:req.body.description,

type:req.body.type,

url:result.secure_url

});

await media.save();


/* SUCCESS */

res.status(201).json({

message:
"Media uploaded successfully",

media

});

}catch(error){

console.log(error);

res.status(500).json({

error:
"Media upload failed"

});

}

});




// ---------- GET ALL MEDIA ----------

app.get(
"/api/media",
async (req, res) => {

try{

const media =
await Media.find()
.sort({ createdAt:-1 });

res.json(media);

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to fetch media"

});

}

});




// ---------- DELETE MEDIA ----------

app.delete(
"/api/media/:id",
async (req, res) => {

try{

await Media.findByIdAndDelete(
req.params.id
);

res.json({

success:true,

message:"Media deleted"

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Delete failed"

});

}

});







// ======================================================
// ===================== INDEX ROUTES ===================
// ======================================================


// ---------- LATEST SERMON ----------

app.get(
"/api/latest-sermon",
async (req, res) => {

try{

const sermon =
await Sermon.findOne()
.sort({ createdAt:-1 });

res.json(sermon);

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed"

});

}

});




// ---------- LATEST MEDIA ----------

app.get(
"/api/latest-media",
async (req, res) => {

try{

const media =
await Media.find()
.sort({ createdAt:-1 })
.limit(6);

res.json(media);

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed"

});

}

});










// ===================== UPDATE MEDIA ROUTE ===========================
app.put(
"/api/media/:id",
async(req,res)=>{

try{

const updated =
await Media.findByIdAndUpdate(

req.params.id,

{
title:req.body.title,
description:req.body.description
},

{new:true}

);

res.json(updated);

}catch(error){

res.status(500).json({
error:"Update failed"
});

}

});







/* =========================    LIVE STREAM SCHEMA ========================= */

const liveSchema =
new mongoose.Schema({

youtubeLiveId:String,

facebookLiveUrl:String,

isLive:{
type:Boolean,
default:false
},

title:String,

updatedAt:{
type:Date,
default:Date.now
}

});

const Live =
mongoose.model(
"Live",
liveSchema
);



/* =========================    GET LIVE SETTINGS ========================= */



// current live source
let liveData = {
  youtubeId: "",
  facebookUrl: ""
};

/* =========================
   GET LIVE
========================= */
app.get("/api/live", (req, res) => {

  res.json(liveData);

});

/* =========================
   UPDATE LIVE
========================= */
app.post("/api/live", (req, res) => {

  console.log("BODY:", req.body);

  const {
    youtubeId,
    facebookUrl
  } = req.body || {};

  liveData = {
    youtubeId: youtubeId || "",
    facebookUrl: facebookUrl || ""
  };

  res.json({
    success: true,
    liveData
  });

});









/* =========================================    BLOG MODEL ========================================= */

const blogSchema =
new mongoose.Schema({

title:{
type:String,
required:true
},

description:{
type:String,
default:""
},

content:{
type:String,
default:""
},

image:{
type:String,
required:true
}

},{
timestamps:true
});

const Blog =
mongoose.model(
"Blog",
blogSchema);





/* =========================    BLOG ROUTES ========================= */


/* GET ALL BLOGS */

app.get(
"/api/blogs",

async(req,res)=>{

try{

const blogs =
await Blog.find()
.sort({createdAt:-1});

res.status(200).json(blogs);

}catch(error){

console.log(error);

res.status(500).json({
error:"Failed to fetch blogs"
});

}

});



/* GET SINGLE BLOG */

app.get(
"/api/blogs/:id",

async(req,res)=>{

try{

const blog =
await Blog.findById(
req.params.id
);

if(!blog){

return res.status(404).json({
error:"Blog not found"
});

}

res.status(200).json(blog);

}catch(error){

console.log(error);

res.status(500).json({
error:"Failed to fetch blog"
});

}

});



/* CREATE BLOG */

app.post(

"/api/blogs",

upload.single("image"),

async(req,res)=>{

try{

if(!req.file){

return res.status(400).json({
error:"No image uploaded"
});

}


/* CLOUDINARY */

const result =
await cloudinary.uploader.upload(

req.file.path,

{
folder:"blogs"
}

);


/* SAVE BLOG */

const newBlog =
new Blog({

title:req.body.title,

description:req.body.description,

content:req.body.content,

image:result.secure_url

});


await newBlog.save();


res.status(201).json({

message:
"Blog uploaded successfully",

blog:newBlog

});

}catch(error){

console.log(error);

res.status(500).json({
error:"Blog upload failed"
});

}

});



/* UPDATE BLOG */

app.put(

"/api/blogs/:id",

async(req,res)=>{

try{

const updatedBlog =
await Blog.findByIdAndUpdate(

req.params.id,

{
title:req.body.title,
description:req.body.description,
content:req.body.content
},

{
new:true
}

);


res.status(200).json({

message:
"Blog updated",

blog:updatedBlog

});

}catch(error){

console.log(error);

res.status(500).json({
error:"Update failed"
});

}

});



/* DELETE BLOG */

app.delete(

"/api/blogs/:id",

async(req,res)=>{

try{

await Blog.findByIdAndDelete(
req.params.id
);

res.status(200).json({

message:
"Blog deleted"

});

}catch(error){

console.log(error);

res.status(500).json({
error:"Delete failed"
});

}

});





/* =========================    ANNOUNCEMENT SCHEMA ========================= */

const announcementSchema =
new mongoose.Schema({

title:String,

message:String,

date:{
type:Date,
default:Date.now
}

});


const Announcement =
mongoose.model(
"Announcement",
announcementSchema
);



/* =========================    GET ANNOUNCEMENTS ========================= */

app.get(
"/api/announcements",

async(req,res)=>{

try{

const announcements =
await Announcement.find()
.sort({date:-1});

res.json(announcements);

}catch(error){

console.log(error);

res.status(500).json({
error:
"Failed to fetch announcements"
});

}

});



/* =========================    CREATE ANNOUNCEMENT ========================= */

app.post(
"/api/announcements",

async(req,res)=>{

try{

const announcement =
new Announcement({

title:req.body.title,

message:req.body.message

});


await announcement.save();

res.status(201).json({

message:
"Announcement created",

announcement

});

}catch(error){

console.log(error);

res.status(500).json({
error:
"Failed to create announcement"
});

}

});



/* =========================    DELETE ANNOUNCEMENT ========================= */

app.delete(
"/api/announcements/:id",

async(req,res)=>{

try{

await Announcement.findByIdAndDelete(
req.params.id
);

res.json({

message:
"Announcement deleted"

});

}catch(error){

console.log(error);

res.status(500).json({
error:
"Delete failed"
});

}

});



/* =========================    UPDATE ANNOUNCEMENT ========================= */

app.put(
"/api/announcements/:id",

async(req,res)=>{

try{

const updated =
await Announcement.findByIdAndUpdate(

req.params.id,

{
title:req.body.title,
message:req.body.message
},

{new:true}

);

res.json({

message:
"Announcement updated",

updated

});

}catch(error){

console.log(error);

res.status(500).json({

error:
"Failed to update announcement"

});

}

});



















/****************************************************
 * 📺 SAFE IPTV STATE (NO INITIALIZATION ERRORS)
 * Compatible with existing backend
 ****************************************************/

// Ensure global state exists (SAFE for old/new code)
global.tv = global.tv || {};

// Ensure YouTube object exists
global.tv.youtubeLive = global.tv.youtubeLive || {
  mode: "channel",   // "channel" | "video"
  value: "",
  enabled: true
};

// Shortcut reference
const tv = global.tv;


/****************************************************
 * 🎛️ UPDATE YOUTUBE LIVE SETTINGS
 ****************************************************/
app.post("/api/youtube/live", (req, res) => {

  const { mode, value, enabled } = req.body;

  if (mode) tv.youtubeLive.mode = mode;
  if (value) tv.youtubeLive.value = value;
  if (typeof enabled === "boolean") tv.youtubeLive.enabled = enabled;

  res.json({
    status: "ok",
    youtubeLive: tv.youtubeLive
  });

});


/****************************************************
 * 📺 GET YOUTUBE LIVE EMBED URL
 ****************************************************/
function getYouTubeLiveUrl() {

  if (!tv.youtubeLive.enabled) {
    return null;
  }

  // 🔴 CHANNEL MODE (BEST PRACTICE)
  if (tv.youtubeLive.mode === "channel") {
    return `https://www.youtube.com/embed/live_stream?channel=${tv.youtubeLive.value}`;
  }

  // 🎬 VIDEO MODE (LEGACY SUPPORT)
  return `https://www.youtube.com/embed/${tv.youtubeLive.value}`;
}


/****************************************************
 * 📡 PREVIEW ENDPOINT (SAFE DEBUG TOOL)
 ****************************************************/
app.get("/api/youtube/preview", (req, res) => {

  res.json({
    status: "ok",
    mode: tv.youtubeLive.mode,
    enabled: tv.youtubeLive.enabled,
    channelOrVideo: tv.youtubeLive.value,
    url: getYouTubeLiveUrl()
  });

});


































// CURRENT LIVE STATE
let liveState = {
  type: "youtube",
  youtubeId: "DEFAULT_ID",
  facebookUrl: "",
  channel: "main"
};

// MULTI-CHANNEL SYSTEM
let channels = {
  main: liveState,
  music: {
    type: "youtube",
    youtubeId: "MUSIC_ID",
    facebookUrl: ""
  },
  news: {
    type: "youtube",
    youtubeId: "NEWS_ID",
    facebookUrl: ""
  }
};

// SCHEDULE SYSTEM
let schedule = [
  {
    time: "08:00",
    channel: "news"
  },
  {
    time: "18:00",
    channel: "music"
  }
];

// 🔴 GET LIVE (REAL-TIME)
app.get("/api/live", (req, res) => {
  res.json(liveState);
});

// 📺 GET ALL CHANNELS (MULTI-TV)
app.get("/api/channels", (req, res) => {
  res.json(channels);
});

// 🎛 SWITCH CHANNEL (REAL-TIME CONTROL)
app.post("/api/switch", (req, res) => {
  const { channel } = req.body;

  if (channels[channel]) {
    liveState = {
      ...channels[channel],
      channel
    };
  }

  res.json({ success: true, liveState });
});

// 📅 UPDATE SCHEDULE
app.post("/api/schedule", (req, res) => {
  schedule = req.body.schedule;
  res.json({ success: true, schedule });
});

// ⏱ AUTO SCHEDULER ENGINE
setInterval(() => {
  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
":" +
    now.getMinutes().toString().padStart(2, "0");

  schedule.forEach(item => {
    if (item.time === currentTime) {
      if (channels[item.channel]) {
        liveState = {
          ...channels[item.channel],
          channel: item.channel
        };
        console.log("Auto-switched to:", item.channel);
      }
    }
  });
}, 60000); // check every 1 min



app.post("/api/live", (req, res) => {
  liveState = {
    type: req.body.type || "youtube",
    youtubeId: req.body.youtubeId || "",
    facebookUrl: req.body.facebookUrl || "",
    channel: req.body.channel || "main"
  };

  res.json({ success: true, liveState });
});





















































/* =========================
   TEST ROUTE
========================= */

app.get("/abc",(req,res)=>{

res.send("ABC WORKING");

});



/* =========================
   FRONTEND / CATCH-ALL
========================= */

// ======================================================
// ===================== FRONTEND =======================
// ======================================================

app.get("*", (req, res) => {

res.sendFile(
path.join(
__dirname,
"public",
"index.html"
)
);

});


/* =========================
   START SERVER
========================= */
// ======================================================
// ===================== PORT ===========================
// ======================================================


const PORT =
process.env.PORT || 5000;

app.listen(PORT, ()=>{

console.log(
`Server running on ${PORT}`
);

});
