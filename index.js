import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 20000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  comments: [commentSchema]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);

function makeToken(user) {
  return jwt.sign({ id: user._id.toString(), name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please log in first." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}
function handleError(res, error) {
  if (error?.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
  console.error(error);
  return res.status(500).json({ message: "Something went wrong on the server." });
}

app.get("/", (_req, res) => res.json({ message: "Blog Platform API is running" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !email || password.length < 6) {
      return res.status(400).json({ message: "Enter your name, a valid email, and a password with at least 6 characters." });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ token: makeToken(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { handleError(res, error); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json({ token: makeToken(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { handleError(res, error); }
});

app.get("/api/posts", async (_req, res) => {
  try {
    const posts = await Post.find().select("-comments").sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { handleError(res, error); }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (error) { res.status(400).json({ message: "Invalid post ID." }); }
});

app.post("/api/posts", auth, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content) return res.status(400).json({ message: "Title and content are required." });
    const post = await Post.create({ title, content, author: req.user.id, authorName: req.user.name });
    res.status(201).json(post);
  } catch (error) { handleError(res, error); }
});

app.put("/api/posts/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ message: "You can only edit your own posts." });
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content) return res.status(400).json({ message: "Title and content are required." });
    post.title = title; post.content = content;
    await post.save();
    res.json(post);
  } catch (error) { res.status(400).json({ message: "Could not update this post." }); }
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ message: "You can only delete your own posts." });
    await post.deleteOne();
    res.json({ message: "Post deleted." });
  } catch (error) { res.status(400).json({ message: "Could not delete this post." }); }
});

app.post("/api/posts/:id/comments", auth, async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Comment cannot be empty." });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    post.comments.push({ author: req.user.id, authorName: req.user.name, text });
    await post.save();
    res.status(201).json(post);
  } catch (error) { res.status(400).json({ message: "Could not add comment." }); }
});

app.delete("/api/posts/:postId/comments/:commentId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found." });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: "You can only delete your own comments." });
    comment.deleteOne();
    await post.save();
    res.json(post);
  } catch (error) { res.status(400).json({ message: "Could not delete comment." }); }
});

const port = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Create server/.env using .env.example.");
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blog_platform")
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
