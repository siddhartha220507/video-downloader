const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

exports.getVideoInfo = (req, res) => {
    const { url } = req.body;

    const ytdlp = spawn("yt-dlp.exe", ["-j", url]);

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
};

exports.downloadVideo = (req, res) => {
    const { url, type } = req.body;

    let args;
    let file;

    if (type === "mp3") {
        file = "audio.mp3";
        args = ["-x", "--audio-format", "mp3", "-o", file, url];
    } else if (type === "mp4") {
        file = "video.mp4";
        args = ["-f", "bestvideo+bestaudio", "-o", file, url];
    } else if (type === "video-only") {
        file = "video_only.mp4";
        args = ["-f", "bestvideo", "-o", file, url];
    }

    const ytdlp = spawn("yt-dlp.exe", args);

    ytdlp.on("close", () => {
        const filePath = path.join(__dirname, "..", file);

        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });
    });
};