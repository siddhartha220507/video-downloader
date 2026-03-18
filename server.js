const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Advanced CORS Configuration - Allow all origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins (localhost, 192.168.x.x, etc.)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!', timestamp: new Date().toISOString() });
});

// STEP 1: GET INFO (Fetch video title & thumbnail)
app.post("/api/info", async (req, res) => {
  const { url } = req.body;

  const getVideoId = (url) => {
    try {
      if (url.includes("youtu.be")) {
        return url.split("youtu.be/")[1];
      }
      return url.split("v=")[1];
    } catch {
      return null;
    }
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return res.status(400).send("Invalid URL");
  }

  try {
    console.log("📹 Fetching info for video ID:", videoId);

    // Try youtube-mp36 API first for video info
    const response = await fetch(`https://youtube-mp36.p.rapidapi.com/info?id=${videoId}`, {
      headers: {
        "x-rapidapi-key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com"
      }
    });

    const data = await response.json();

    console.log("📥 Info Response:", data);

    // Extract thumbnail from various possible locations
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    if (data?.thumbnail) {
      thumbnailUrl = data.thumbnail;
    } else if (data?.image) {
      thumbnailUrl = data.image;
    }

    res.json({
      title: data?.title || data?.name || "YouTube Video",
      thumbnail: thumbnailUrl,
      videoDetails: {
        title: data?.title || data?.name,
        thumbnail: thumbnailUrl
      }
    });

  } catch (err) {
    console.error("❌ Info Error:", err.message);
    
    // Fallback: Return default with YouTube thumbnail
    const videoId = getVideoId(url);
    res.json({
      title: "YouTube Video",
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoDetails: {
        title: "YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    });
  }
});

// STEP 2: DOWNLOAD MP3 (Direct Redirect - No Streaming)
const downloadHandler = async (req, res) => {
  const url = req.body?.url || req.query?.url;

  const getVideoId = (url) => {
    try {
      if (url.includes("youtu.be")) {
        return url.split("youtu.be/")[1];
      }
      return url.split("v=")[1];
    } catch {
      return null;
    }
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return res.status(400).send("Invalid URL");
  }

  try {
    console.log("🎯 Fetching MP3 for video ID:", videoId);

    const apiRes = await fetch(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
      {
        headers: {
          "x-rapidapi-key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
          "x-rapidapi-host": "youtube-mp36.p.rapidapi.com"
        }
      }
    );

    const data = await apiRes.json();

    console.log("📥 API Response:", data);

    if (!data || !data.link) {
      console.error("❌ No download link:", data);
      return res.status(500).send("Download link not found");
    }

    console.log("🔗 Redirecting to:", data.link.substring(0, 100));

    // ✅ DIRECT DOWNLOAD REDIRECT
    res.redirect(data.link);

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).send("Download failed");
  }
};

// Support both GET and POST
app.get("/api/download", downloadHandler);
app.post("/api/download", downloadHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("🎵 Server running on port", PORT));