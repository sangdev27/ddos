const express = require("express");
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// ====== Metrics ======
let totalRequests = 0;
let requestsThisSecond = 0;

// Middleware đếm request
app.use((req, res, next) => {
  totalRequests++;
  requestsThisSecond++;
  next();
});

// Reset mỗi giây
setInterval(() => {
  requestsThisSecond = 0;
}, 1000);

// ====== CPU calculation ======
let lastCpuInfo = os.cpus();

function getCPUUsage() {
  const cpus = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < cpus.length; i++) {
    const prev = lastCpuInfo[i].times;
    const curr = cpus[i].times;

    const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0);
    const currTotal = Object.values(curr).reduce((a, b) => a + b, 0);

    idleDiff += curr.idle - prev.idle;
    totalDiff += currTotal - prevTotal;
  }

  lastCpuInfo = cpus;

  return 100 - (idleDiff / totalDiff) * 100;
}

// ====== RAM ======
function getRAMUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;

  return {
    usedMB: (used / 1024 / 1024).toFixed(2),
    totalMB: (total / 1024 / 1024).toFixed(2),
  };
}

// ====== WebSocket ======
io.on("connection", (socket) => {
  console.log("Client connected");

  const interval = setInterval(() => {
    socket.emit("stats", {
      totalRequests,
      rps: requestsThisSecond,
      cpu: getCPUUsage().toFixed(2),
      ram: getRAMUsage(),
    });
  }, 1000);

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

// ====== Start ======
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
