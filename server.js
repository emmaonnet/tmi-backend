const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();



/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());

app.use(
express.urlencoded({
extended:true
})
);



/* =========================
   CREATE UPLOADS FOLDER
========================= */

if(!fs.existsSync("uploads")){

fs.mkdirSync("uploads");

}



/* =========================
   STATIC FOLDER
========================= */

app.use(
"/uploads",
express.static(
path.join(__dirname,"uploads")
)
);



/* =========================
   MONGODB
========================= */

mongoose.connect(
process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tmi-tv",
{
useNewUrlParser:true,
useUnifiedTopology:true
}
)
.then(()=>{

console.log("MongoDB Connected");

})
.catch(err=>{

console.log(err);

});



/* =========================
   MODELS
========================= */

const sermonSchema =
new mongoose.Schema({

title:String,
description:String,
image:String,
video:String,

createdAt:{
type:Date,
default:Date.now
}

});

const blogSchema =
new mongoose.Schema({

title:String,
content:String,
image:String,

createdAt:{
type:Date,
default:Date.now
}

});

const mediaSchema =
new mongoose.Schema({

title:String,
description:String,
url:String,

createdAt:{
type:Date,
default:Date.now
}

});

const announcementSchema =
new mongoose.Schema({

title:String,
content:String,

createdAt:{
type:Date,
default:Date.now
}

});

const liveSchema =
new mongoose.Schema({

isLive:Boolean,
platform:String,
title:String,
description:String,
youtubeChannel:String,
facebookPage:String,

createdAt:{
type:Date,
default:Date.now
}

});



const Sermon =
mongoose.model(
"Sermon",
sermonSchema
);

const Blog =
mongoose.model(
"Blog",
blogSchema
);

const Media =
mongoose.model(
"Media",
mediaSchema
);

const Announcement =
mongoose.model(
"Announcement",
announcementSchema
);

const Live =
mongoose.model(
"Live",
liveSchema
);



/* =========================
   MULTER
========================= */

const storage =
multer.diskStorage({

destination:(req,file,cb)=>{

cb(null,"uploads/");

},

filename:(req,file,cb)=>{

cb(
null,
Date.now() +
"-" +
file.originalname
);

}

});

const upload =
multer({
storage
});



/* =========================
   LIVE ROUTES
========================= */

app.post(
"/api/live",
async(req,res)=>{

try{

await Live.deleteMany({});

const live =
new Live(req.body);

await live.save();

res.json({

success:true,
message:"Live updated"

});

}catch(error){

console.log(error);

res.status(500).json({

success:false

});

}

});



app.get(
"/api/live",
async(req,res)=>{

const live =
await Live.findOne()
.sort({createdAt:-1});

res.json(live);

});



/* =========================
   SERMON ROUTES
========================= */

app.post(
"/api/sermons",
upload.single("image"),
async(req,res)=>{

try{

console.log(req.file);

if(!req.file){

return res.status(400).json({

success:false,
message:"No image uploaded"

});

}

const sermon =
new Sermon({

title:req.body.title,

description:req.body.description,

video:req.body.video || "",

image:
`${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

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
message:error.message

});

}

});



app.get(
"/api/sermons",
async(req,res)=>{

const sermons =
await Sermon.find()
.sort({createdAt:-1});

res.json(sermons);

});



app.delete(
"/api/sermons/:id",
async(req,res)=>{

await Sermon.findByIdAndDelete(
req.params.id
);

res.json({

success:true

});

});



/* =========================
   BLOG ROUTES
========================= */

app.post(
"/api/blogs",
upload.single("image"),
async(req,res)=>{

try{

console.log(req.file);

if(!req.file){

return res.status(400).json({

success:false,
message:"No image uploaded"

});

}

const blog =
new Blog({

title:req.body.title,

content:req.body.content,

image:
`${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

});

await blog.save();

res.json({

success:true,
message:"Blog uploaded",
blog

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,
message:error.message

});

}

});



app.get(
"/api/blogs",
async(req,res)=>{

const blogs =
await Blog.find()
.sort({createdAt:-1});

res.json(blogs);

});



app.delete(
"/api/blogs/:id",
async(req,res)=>{

await Blog.findByIdAndDelete(
req.params.id
);

res.json({

success:true

});

});



/* =========================
   MEDIA ROUTES
========================= */

app.post(
"/api/media",
upload.single("media"),
async(req,res)=>{

try{

console.log(req.file);

if(!req.file){

return res.status(400).json({

success:false,
message:"No media uploaded"

});

}

const media =
new Media({

title:
req.body.title ||
"TMI Media",

description:
req.body.description ||
"Media Upload",

url:
`${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

});

await media.save();

res.json({

success:true,
message:"Media uploaded successfully",
media

});

}catch(error){

console.log(error);

res.status(500).json({

success:false,
message:error.message

});

}

});



app.get(
"/api/media",
async(req,res)=>{

const media =
await Media.find()
.sort({createdAt:-1});

res.json(media);

});



app.delete(
"/api/media/:id",
async(req,res)=>{

await Media.findByIdAndDelete(
req.params.id
);

res.json({

success:true

});

});









/* =========================
   ANNOUNCEMENTS
========================= */

app.post(
"/api/announcements",
async(req,res)=>{

try{

const announcement =
new Announcement({

title:req.body.title,
content:req.body.content

});

await announcement.save();

res.json({

success:true,
message:"Announcement added"

});

}catch(error){

console.log(error);

res.status(500).json({

success:false

});

}

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



/* =========================
   VISITORS
========================= */

app.get(
"/api/visitors",
(req,res)=>{

res.json({

message:
"🇳🇬 Nigeria: 30 • 🇺🇸 USA: 5 • Total Visitors: 35"

});

});



/* =========================
   ROOT
========================= */

app.get("/",(req,res)=>{

res.send("TMI Backend Running");

});



/* =========================
   SERVER
========================= */

const PORT =
process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log(
`Server running on port ${PORT}`
);

});
