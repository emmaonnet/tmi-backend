require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;



const path = require("path");

const app = express();


// ======================================================
// ===================== MIDDLEWARE =====================
// ======================================================

app.use(cors());

app.use(express.json({
limit:"50mb"
}));

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



// ================= LIVE MODEL =================

const liveSchema =
new mongoose.Schema({

title:String,

description:String,

nextServiceDate:String,

offlineVideo:String,

youtubeChannelId:String,

isLive:{
type:Boolean,
default:false
}

});

const LiveSettings =
mongoose.model(
"LiveSettings",
liveSchema
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
async (req, res) => {

try{

if(!req.file){

return res.status(400).json({
error:"No file uploaded"
});

}

const result =
await cloudinary.uploader.upload(
req.file.path,
{
resource_type:"auto",
folder:"testimony-missions"
}
);

const media =
new Media({

title:req.body.title,

description:req.body.description,

type:req.body.type,

url:result.secure_url

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
error:"Upload failed"
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
// ===================== LIVE ROUTES ====================
// ======================================================


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
req.body.offlineVideo,

youtubeChannelId:
req.body.youtubeChannelId,

isLive:req.body.isLive

});

await live.save();

res.json({

success:true,

message:"Live settings saved"

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

error:"Failed to fetch live settings"

});

}

});




// ======================================================
// ===================== LIVE STATUS ====================
// ======================================================

app.get(
"/api/live",
async (req, res) => {

try{

const settings =
await LiveSettings.findOne();

if(!settings){

return res.json({

isLive:false,

title:"",

description:"",

nextServiceDate:"",

offlineVideo:""

});

}

res.json({

isLive:settings.isLive,

title:settings.title,

description:settings.description,

nextServiceDate:
settings.nextServiceDate,

offlineVideo:
settings.offlineVideo,

youtubeChannelId:
settings.youtubeChannelId

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,

error:"Failed to fetch live data"

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




// ======================================================
// ===================== PORT ===========================
// ======================================================

const PORT =
process.env.PORT || 5000;

app.listen(PORT, () => {

console.log(
`Server running on port ${PORT}`
);

});








// ===================== ANNOUNCEMENT MODEL ===========================

const announcementSchema =
new mongoose.Schema({

title:String,

message:String

},{
timestamps:true
});

const Announcement =
mongoose.model(
"Announcement",
announcementSchema
);


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


// =====================ANNOUNCEMENT ROUTE ===========================

app.post(
"/api/announcements",
async(req,res)=>{

const announcement =
new Announcement({

title:req.body.title,

message:req.body.message

});

await announcement.save();

res.json(announcement);

});


app.get(
"/api/announcements",
async(req,res)=>{

const announcements =
await Announcement.find()
.sort({createdAt:-1});

res.json(announcements);

});


app.delete(
"/api/announcements/:id",
async(req,res)=>{

await Announcement.findByIdAndDelete(
req.params.id
);

res.json({
success:true
});

});

// =====================LIVE SETTING ROUTE ===========================

app.put(
"/api/live-settings",
async(req,res)=>{

try{

let settings =
await LiveSettings.findOne();

if(!settings){

settings =
new LiveSettings(req.body);

}else{

Object.assign(
settings,
req.body
);

}

await settings.save();

res.json(settings);

}catch(error){

res.status(500).json({
error:"Live update failed"
});

}

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



/* =========================================    BLOG UPLOAD========================================= */

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


/* CLOUDINARY UPLOAD */

const result =
await cloudinary.uploader.upload(
req.file.path,
{
folder:"blogs"
}
);


/* SAVE BLOG */

const blog =
new Blog({

title:req.body.title,

description:
req.body.description,

content:
req.body.content,

image:
result.secure_url

});


await blog.save();


/* RESPONSE */

res.status(201).json({

message:
"Blog uploaded successfully",

blog

});

}catch(error){

console.log(error);

res.status(500).json({

error:
"Blog upload failed"

});

}

});



/* =========================================    GET ALL BLOGS========================================= */

app.get(
"/api/blogs",

async(req,res)=>{

try{

const blogs =
await Blog.find()
.sort({createdAt:-1});

res.json(blogs);

}catch(error){

console.log(error);

res.status(500).json({

error:
"Failed to fetch blogs"

});

}

});



/* =========================================    GET SINGLE BLOG========================================= */

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

error:
"Blog not found"

});

}

res.json(blog);

}catch(error){

console.log(error);

res.status(500).json({

error:
"Failed to fetch blog"

});

}

});



/* =========================================    UPDATE BLOG========================================= */

app.put(
"/api/blogs/:id",

async(req,res)=>{

try{

const updatedBlog =
await Blog.findByIdAndUpdate(

req.params.id,

{
title:req.body.title,

description:
req.body.description,

content:
req.body.content

},

{new:true}

);


if(!updatedBlog){

return res.status(404).json({

error:
"Blog not found"

});

}


res.json({

message:
"Blog updated",

updatedBlog

});

}catch(error){

console.log(error);

res.status(500).json({

error:
"Update failed"

});

}

});



/* =========================================     DELETE BLOG========================================= */

app.delete(
"/api/blogs/:id",

async(req,res)=>{

try{

const deletedBlog =
await Blog.findByIdAndDelete(
req.params.id
);


if(!deletedBlog){

return res.status(404).json({

error:
"Blog not found"

});

}


res.json({

message:
"Blog deleted successfully"

});

}catch(error){

console.log(error);

res.status(500).json({

error:
"Delete failed"

});

}

});
