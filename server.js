const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

/* STEP A: GET VIDEO INFO */
app.post("/api/info", (req, res) => {
    const { url } = req.body;

    const ytdlp = spawn("yt-dlp", ["-j", url]);

    let data = "";

    ytdlp.stdout.on("data", chunk => data += chunk);

    ytdlp.on("close", () => {
        try {
            const json = JSON.parse(data);

            res.json({
                title: json.title,
                thumbnail: json.thumbnail
            });
        } catch {
            res.status(500).send("Error fetching info");
        }
    });
});

/* STEP B: DOWNLOAD */
app.post("/api/download", (req, res) => {
    const { url, type } = req.body;

    const unique = Date.now();
    let args;

    if (type === "mp3") {
        args = [
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "192K",
            "-o", `audio_${unique}.%(ext)s`,
            url
        ];
    }

    if (type === "mp4") {
        args = [
            "-f", "best[ext=mp4]",
            "-o", `video_${unique}.%(ext)s`,
            url
        ];
    }

    if (type === "video-only") {
        args = [
            "-f", "bv*",
            "--merge-output-format", "mp4",
            "-o", `video_only_${unique}.mp4`,
            url
        ];
    }

    const ytdlp = spawn("yt-dlp", args);

    ytdlp.on("close", (code) => {
        if (code !== 0) {
            return res.status(500).send("Download failed");
        }

        const files = fs.readdirSync(__dirname);

        const file = files.find(f =>
            f.endsWith(".mp4") ||
            f.endsWith(".mp3") ||
            f.endsWith(".webm")
        );

        if (!file) {
            return res.status(500).send("Download failed");
        }

        const filePath = path.join(__dirname, file);

        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));