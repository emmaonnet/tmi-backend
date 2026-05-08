require("dotenv").config();

console.log("MONGO URI:", process.env.MONGO_URI);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");




const {
CloudinaryStorage
} = require(
"multer-storage-cloudinary"
);


const app = express();


// ================= MIDDLEWARE =================

app.use(cors());

app.use(express.json());


=======
app.use(express.urlencoded({
extended:true
}));



// ================= MONGODB =================

mongoose.connect(
process.env.MONGODB_URI
)
.then(() => {

console.log("MongoDB Connected");

})
.catch((err) => {

console.log(err);

});


// ================= CLOUDINARY =================

cloudinary.config({

cloud_name:
process.env.CLOUDINARY_NAME,

api_key:
process.env.CLOUDINARY_KEY,

api_secret:
process.env.CLOUDINARY_SECRET

});


// ================= CLOUDINARY STORAGE =================

const storage =
new CloudinaryStorage({

cloudinary,

params: async (req, file) => ({

folder: "testimony-missions",

resource_type: "auto"

})

});

const upload =
multer({ storage });


// ================= MODELS =================


// ---------- SERMON MODEL ----------

const sermonSchema =
new mongoose.Schema({

title:String,

description:String,

category:String,

duration:String,

videoUrl:String,

thumbnail:String

},{
timestamps:true
});

const Sermon =
mongoose.model(
"Sermon",
sermonSchema
);


// ---------- MEDIA MODEL ----------

const mediaSchema =
new mongoose.Schema({

title:String,

description:String,

type:String,

url:String

},{
timestamps:true
});

const Media =
mongoose.model(
"Media",
mediaSchema
);


// ---------- LIVE SETTINGS MODEL ----------

const liveSchema =
new mongoose.Schema({

title:String,

description:String,

nextServiceDate:String,

offlineVideo:String

});

const LiveSettings =
mongoose.model(
"LiveSettings",
liveSchema
);



// =====================================================
// ================= SERMON ROUTES =====================
// =====================================================


// ---------- UPLOAD SERMON ----------

app.post(
"/api/sermons",
upload.single("thumbnail"),
async (req, res) => {

try{

if(!req.file){

return res.status(400).json({
error:"Thumbnail required"
});

}

const sermon =
new Sermon({

title:req.body.title,

description:req.body.description,

category:req.body.category,

duration:req.body.duration,

videoUrl:req.body.videoUrl,

thumbnail:req.file.path

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

success:false,

error:"Failed to upload sermon"

});

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


// ---------- GET SERMONS ----------

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



// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }

});




// =====================================================
// ================= MEDIA ROUTES ======================
// =====================================================


// ---------- UPLOAD MEDIA ----------

app.post(
"/api/media",
upload.single("file"),
async (req, res) => {

try{

if(!req.file){

return res.status(400).json({
error:"Media file required"
});

}

const media =
new Media({

title:req.body.title,

description:req.body.description,

type:req.body.type,

url:req.file.path

});

await media.save();

res.json({

success:true,

message:"Media uploaded",

media

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to upload media"

});

}

});


// ---------- GET MEDIA ----------

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




// =====================================================
// ================= LIVE SETTINGS =====================
// =====================================================


// ---------- SAVE LIVE SETTINGS ----------

app.post(
"/api/live-settings",
async (req, res) => {

try{

await LiveSettings.deleteMany();

const live =
new LiveSettings({

title:req.body.title,

description:req.body.description,

nextServiceDate:
req.body.nextServiceDate,

offlineVideo:
req.body.offlineVideo

});

await live.save();

res.json({

success:true,

message:"Live settings updated"

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to save live settings"

});

}

});


// ---------- GET LIVE SETTINGS ----------

app.get(
"/api/live-settings",
async (req, res) => {

try{

const settings =
await LiveSettings.findOne();

res.json(settings);

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to fetch settings"

});

}

});




// =====================================================
// ================= LIVE STATUS =======================
// =====================================================


// This can later connect directly
// to YouTube Live API

app.get(
"/api/live",
async (req, res) => {

try{

const settings =
await LiveSettings.findOne();

res.json({

isLive:false,

title:
settings?.title || "",

description:
settings?.description || "",

nextServiceDate:
settings?.nextServiceDate || "",

offlineVideo:
settings?.offlineVideo || ""

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to fetch live data"

});

}

});




// =====================================================
// ================= ROOT ==============================
// =====================================================

app.get("/", (req, res) => {

res.send("Testimony Missions Backend Running");

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



// =====================================================
// ================= PORT ==============================
// =====================================================

const PORT =
process.env.PORT || 5000;


app.listen(PORT, () => {

console.log(
`Server running on port ${PORT}`
);

});


















