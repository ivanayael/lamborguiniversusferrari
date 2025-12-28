const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {
    bronze: new Set(),
    silver: new Set(),
    gold: new Set()
};

const players = new Map();

wss.on("connection", ws => {
    let tier = "bronze";

    ws.on("message", msg => {
        const data = JSON.parse(msg);

        if (data.type === "JOIN") {
            tier = data.tier;
            rooms[tier].add(ws);
            players.set(ws, { x: 140, score: 0, speed: 4 });
        }

        if (data.type === "INPUT") {
            const p = players.get(ws);
            if (!p) return;

            if (data.dir === "LEFT") p.x -= 40;
            if (data.dir === "RIGHT") p.x += 40;

            p.x = Math.max(0, Math.min(280, p.x));
        }

        if (data.type === "STATE") {
            const p = players.get(ws);
            if (!p) return;

            if (data.speed > 15) {
                ws.close();
                return;
            }

            p.x = data.x;
            p.score = data.score;
            p.speed = data.speed;
        }
    });

    ws.on("close", () => {
        rooms[tier].delete(ws);
        players.delete(ws);
    });
});

setInterval(() => {
    Object.keys(rooms).forEach(tier => {
        const snapshot = [];

        rooms[tier].forEach(ws => {
            const p = players.get(ws);
            if (p) snapshot.push(p);
        });

        rooms[tier].forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "SNAPSHOT",
                    players: snapshot
                }));
            }
        });
    });
}, 100);

console.log("Servidor activo en ws://localhost:8080");
