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

// STEP 1: GET INFO
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
    const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}`, {
      headers: {
        "X-RapidAPI-Key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    const data = await response.json();

    // Get thumbnail URL with proper fallbacks
    let thumbnailUrl = "https://via.placeholder.com/300";
    
    if (data.thumbnail) {
      // If thumbnail is an array
      if (Array.isArray(data.thumbnail) && data.thumbnail[0]?.url) {
        thumbnailUrl = data.thumbnail[0].url;
      }
      // If thumbnail is a string URL
      else if (typeof data.thumbnail === 'string' && data.thumbnail.startsWith('http')) {
        thumbnailUrl = data.thumbnail;
      }
    }

    res.json({
      title: data.title || "No title",
      thumbnail: thumbnailUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching info");
  }
});

// STEP 2: DOWNLOAD MP3 (2-Step API: Init → Poll → Download)
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
    // STEP 1: INIT CONVERSION
    const initRes = await fetch(
      `https://youtube-mp4-mp3-downloader.p.rapidapi.com/api/v1/init?id=${videoId}`,
      {
        headers: {
          "x-rapidapi-key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
          "x-rapidapi-host": "youtube-mp4-mp3-downloader.p.rapidapi.com"
        }
      }
    );

    const initData = await initRes.json();
    const conversionId = initData.id;

    if (!conversionId) {
      return res.status(500).send("Failed to start conversion");
    }

    console.log("🆔 Conversion ID:", conversionId);

    // STEP 2: POLLING (wait until ready)
    let downloadUrl = null;

    for (let i = 0; i < 10; i++) {
      const progressRes = await fetch(
        `https://youtube-mp4-mp3-downloader.p.rapidapi.com/api/v1/progress?id=${conversionId}`,
        {
          headers: {
            "x-rapidapi-key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
            "x-rapidapi-host": "youtube-mp4-mp3-downloader.p.rapidapi.com"
          }
        }
      );

      const progressData = await progressRes.json();

      console.log(`⏳ Attempt ${i + 1}:`, progressData);

      if (progressData.status === "finished") {
        downloadUrl = progressData.download_url;
        break;
      }

      // Wait 3 seconds before next check
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!downloadUrl) {
      return res.status(500).send("Still processing, try again");
    }

    // STEP 3: FORCE DOWNLOAD
    const fileRes = await fetch(downloadUrl);

    res.setHeader("Content-Disposition", `attachment; filename="${videoId}.mp3"`);
    res.setHeader("Content-Type", "audio/mpeg");

    fileRes.body.pipe(res);

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