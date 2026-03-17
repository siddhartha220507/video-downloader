const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// STEP 1: GET INFO
app.post("/api/info", async (req, res) => {
  const { url } = req.body;

  try {
    const response = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${url.split("v=")[1]}`, {
      headers: {
        "X-RapidAPI-Key": "demo", // free demo key
        "X-RapidAPI-Host": "yt-api.p.rapidapi.com"
      }
    });

    const data = await response.json();

    res.json({
      title: data.title,
      thumbnail: data.thumbnail[0].url
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching info");
  }
});

// STEP 2: DOWNLOAD (direct link return)
app.post("/api/download", async (req, res) => {
  const { url } = req.body;

  const videoId = url.split("v=")[1];

  res.json({
    downloadUrl: `https://yt-api.p.rapidapi.com/dl?id=${videoId}`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));