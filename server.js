const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const youtubedl = require("youtube-dl-exec");

const app = express();
app.use(cors());
app.use(express.json());

/* STEP A: GET VIDEO INFO */
app.post("/api/info", async (req, res) => {
    const { url } = req.body;
    try {
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true
        });
        
        res.json({
            title: info.title,
            thumbnail: info.thumbnail
        });
    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).send(err.message || "Error fetching info");
    }
});

/* STEP B: DOWNLOAD */
app.post("/api/download", async (req, res) => {
    const { url, type } = req.body;
    const unique = Date.now();
    
    let options = {};
    let outputFilename = "";

    if (type === "mp3") {
        outputFilename = `audio_${unique}.mp3`;
        options = {
            extractAudio: true,
            audioFormat: "mp3",
            audioQuality: "192K",
            output: outputFilename
        };
    } else if (type === "mp4") {
        outputFilename = `video_${unique}.mp4`;
        options = {
            format: "best[ext=mp4]",
            output: outputFilename
        };
    } else if (type === "video-only") {
        outputFilename = `video_only_${unique}.mp4`;
        options = {
            format: "bv*",
            mergeOutputFormat: "mp4",
            output: outputFilename
        };
    }

    try {
        await youtubedl(url, options);
        
        const filePath = path.join(__dirname, outputFilename);
        
        if (fs.existsSync(filePath)) {
            res.download(filePath, outputFilename, (err) => {
                if (!err) {
                    fs.unlinkSync(filePath); // delete after download
                }
            });
        } else {
            res.status(500).send("Download failed: File not found");
        }
    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).send(err.message || "Download failed");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));