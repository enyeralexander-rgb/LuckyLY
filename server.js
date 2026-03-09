import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
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
      if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
        console.log(`> Live chat: Pusher (canal live-chat)`);
      }
    });
});
