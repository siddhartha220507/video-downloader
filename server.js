const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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

// STEP 2: DOWNLOAD (direct link return)
app.post("/api/download", async (req, res) => {
  const { url, type } = req.body;

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

    console.log("📥 API Response - Formats Available:", data.formats?.length || 0);

    let selected;

    if (type === "mp3") {
      // audio only, optionally sorting for best bitrate
      selected = data.formats
        ?.filter(f => f.mimeType?.includes("audio"))
        ?.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      console.log("🎵 Selected MP3:", selected?.mimeType);
    } 
    else if (type === "video-only") {
      // video without audio
      selected = data.formats?.find(f => f.mimeType?.includes("video") && !f.mimeType?.includes("audio"));
      
      // 🔥 fallback if pure video not found
      if (!selected) {
        console.log("⚠️ No pure video found, trying with audio...");
        selected = data.formats?.find(f => f.mimeType?.includes("video"));
      }
      console.log("🎥 Selected Video-Only:", selected?.mimeType);
    } 
    else {
      // mp4 (video + audio)
      selected = data.formats?.find(f => f.mimeType?.includes("video") && f.mimeType?.includes("audio"));
      
      // 🔥 fallback to any video if video+audio not found
      if (!selected) {
        console.log("⚠️ No video+audio found, trying any video...");
        selected = data.formats?.find(f => f.mimeType?.includes("video"));
      }
      console.log("🎬 Selected MP4:", selected?.mimeType);
    }

    if (!selected) {
      console.error("❌ No format found. Available formats:", data.formats?.map(f => f.mimeType));
      return res.status(500).send("No format found for the requested type");
    }

    res.json({ downloadUrl: selected.url });

  } catch (err) {
    console.error(err);
    res.status(500).send("Download failed");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));