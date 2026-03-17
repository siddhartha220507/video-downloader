const express = require("express");
const cors = require("cors");

const videoRoutes = require("./routes/video");

const app = express();

    app.use(cors());
app.use(express.json());

// routes
app.use("/api", videoRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));

module.exports = app;