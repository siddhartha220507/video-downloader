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

    res.json({
      title: data.title || "No title",
      thumbnail: data.thumbnail?.[0]?.url || "https://via.placeholder.com/300"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching info");
  }
});

// STEP 2: DOWNLOAD (direct link return)
app.post("/api/download", async (req, res) => {
  const { url } = req.body;

  const getVideoId = (url) => {
    if (url.includes("youtu.be")) {
      return url.split("youtu.be/")[1];
    }
    return url.split("v=")[1];
  };

  const videoId = getVideoId(url);

  try {
    const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}`, {
      headers: {
        "X-RapidAPI-Key": "6f0a2c61d5msh8b5b913e276ad91p1bc69djsn6b90126b8ef8",
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    const data = await response.json();

    // pick first format
    const downloadLink = data.formats?.[0]?.url;

    if (!downloadLink) {
      return res.status(500).send("No download link found");
    }

    res.json({ downloadUrl: downloadLink });

  } catch (err) {
    console.error(err);
    res.status(500).send("Download failed");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));