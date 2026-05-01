import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

declare global {
  // eslint-disable-next-line no-var
  var io: SocketServer | undefined;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  global.io = io;

  io.on("connection", (socket) => {
    const room = socket.handshake.query.room as string | undefined;
    if (room) socket.join(room);

    socket.on("join", (r: string) => socket.join(r));
    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {
    console.log(`> Serveur prêt sur http://localhost:${port} [${dev ? "dev" : "prod"}]`);
  });
});
