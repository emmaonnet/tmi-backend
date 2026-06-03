const MediaSchema = new mongoose.Schema({
  title: String,
  type: String,

  imageUrl: String,
  videoUrl: String,

  thumbnail: String,

  category: String,
  featured: Boolean,

  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },

  comments: []
}, { timestamps: true });
