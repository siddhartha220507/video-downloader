const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "youtube-mp36.p.rapidapi.com";

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
    const response = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
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
  try {
    const url = req.body?.url || req.query?.url;

    console.log("📥 Download request received");
    console.log("🔍 URL:", url?.substring(0, 50));

    if (!url) {
      console.error("❌ No URL provided");
      return res.status(400).send("URL is required");
    }

    const getVideoId = (url) => {
      try {
        if (url.includes("youtu.be")) {
          return url.split("youtu.be/")[1]?.split("?")[0];
        }
        const match = url.match(/v=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    };

    const videoId = getVideoId(url);

    if (!videoId) {
      console.error("❌ Invalid video ID from URL:", url);
      return res.status(400).send("Invalid YouTube URL");
    }

    console.log("🎯 Fetching MP3 for video ID:", videoId);

    const apiRes = await fetch(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
      {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST
        }
      }
    );

    if (!apiRes.ok) {
      console.error("❌ API error:", apiRes.status);
      return res.status(500).send(`API Error: ${apiRes.status}`);
    }

    const data = await apiRes.json();

    console.log("📥 API Response:", data);

    if (!data || !data.link) {
      console.error("❌ No download link in response");
      return res.status(500).send("Could not get download link");
    }

    console.log("🔗 Redirecting to download...");

    console.log("🔗 Sending download link to frontend...");

    // ✅ RETURN JSON INSTEAD OF REDIRECT
    res.json({ link: data.link });

  } catch (err) {
    console.error("❌ Download Error:", err.message);
    res.status(500).send(`Error: ${err.message}`);
  }
};

// Support both GET and POST for /api/download
app.get("/api/download", downloadHandler);
app.post("/api/download", downloadHandler);


// Catch-all 404 handler for API routes or unhandled methods
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found", path: req.path });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("⚠️ Server Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🎵 Server running on port", PORT);
  console.log("✅ Routes available:");
  console.log("   GET  /api/health");
  console.log("   POST /api/info");
  console.log("   GET  /api/download?url=..."); 
  console.log("   POST /api/download (body: {url})");
});