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
        "X-RapidAPI-Key": "demo",
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

  res.json({
    downloadUrl: `https://yt-api.p.rapidapi.com/dl?id=${videoId}`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));