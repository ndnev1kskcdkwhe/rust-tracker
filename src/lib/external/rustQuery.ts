import dgram from "node:dgram";

/**
 * Raw Source-engine A2S_RULES query, sent straight to the game server (not Steam's API).
 * Verified live on 2026-07-31 against real Rust servers: servers running a rules-broadcasting
 * plugin (Oxide/Carbon "ServerInfo"-style mods) answer with `world.seed` / `world.size` among
 * their rules — real per-server data Steam's master server list never exposes. Many servers
 * don't answer at all (firewalled, or rules broadcasting disabled) — that's expected, not an
 * error, so callers get `null` instead of a thrown exception on timeout.
 *
 * Query goes to the server's *query* port (the port from Steam's `addr` field), not the
 * `gameport` players connect with — those are commonly different ports for Rust servers.
 */

export interface RustServerRules {
  worldSeed: number | null;
  worldSize: number | null;
}

const CHALLENGE_REQUEST = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x56, 0xff, 0xff, 0xff, 0xff]);

function parseRules(msg: Buffer): Record<string, string> {
  let offset = 7; // header(4) + type(1) + rule count(2)
  const ruleCount = msg.readUInt16LE(5);
  const rules: Record<string, string> = {};
  for (let i = 0; i < ruleCount; i++) {
    const keyEnd = msg.indexOf(0, offset);
    if (keyEnd === -1) break;
    const key = msg.toString("utf8", offset, keyEnd);
    offset = keyEnd + 1;
    const valEnd = msg.indexOf(0, offset);
    if (valEnd === -1) break;
    const value = msg.toString("utf8", offset, valEnd);
    offset = valEnd + 1;
    rules[key] = value;
  }
  return rules;
}

export function queryServerRules(ip: string, port: number, timeoutMs = 2500): Promise<RustServerRules | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let settled = false;

    const finish = (result: RustServerRules | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    socket.on("error", () => finish(null));

    socket.on("message", (msg: Buffer) => {
      if (msg.length < 5) {
        finish(null);
        return;
      }
      const type = msg.readUInt8(4);

      if (type === 0x41) {
        // Challenge response — resend the request with the challenge bytes echoed back.
        const challenge = msg.subarray(5, 9);
        const req = Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x56]), challenge]);
        socket.send(req, port, ip);
        return;
      }

      if (type === 0x45) {
        const rules = parseRules(msg);
        const seed = rules["world.seed"];
        const size = rules["world.size"];
        finish({
          worldSeed: seed ? Number(seed) : null,
          worldSize: size ? Number(size) : null,
        });
        return;
      }

      finish(null);
    });

    socket.send(CHALLENGE_REQUEST, port, ip);
  });
}
