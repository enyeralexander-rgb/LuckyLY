import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer();

  const io = new Server(httpServer, {
    path: "/socket.io",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("live-chat:message", (payload) => {
      const { user = "Anónimo", text } = payload || {};
      if (!text || typeof text !== "string") return;
      const trimmed = text.trim().slice(0, 500);
      if (!trimmed) return;
      io.emit("live-chat:message", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        user: String(user).slice(0, 50) || "Anónimo",
        text: trimmed,
        ts: Date.now(),
      });
    });
  });

  httpServer.on("request", (req, res) => {
    if (req.url?.startsWith("/socket.io")) return;
    handle(req, res).catch((err) => {
      console.error("Next request error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, "0.0.0.0", () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Live chat Socket.IO on path /socket.io`);
    });
});
