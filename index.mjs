import router from "micro-router";
import { Store } from "./store.mjs";
import { createHash } from "node:crypto";
import createServer from "@cloud-cli/http";

const store = Store.get(process.env.STORE_ID);
const notFound = (response) => response.writeHead(404, "Not found").end();
const hash = (s) => createHash("sha256").update(s).digest("hex");

const readStream = (stream) => {
  return new Promise((resolve, reject) => {
    const all = [];
    stream.on("error", reject);
    stream.on("data", (c) => all.push(c));
    stream.on("end", () => resolve(Buffer.concat(all)));
  });
};

const readJson = async (stream) => {
  const raw = await readStream(stream);

  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    return null;
  }
};

async function onDeckLoad(_request, response, params) {
  const uid = hash(params.name);
  const deck = await store.getResource("deck").get(uid);

  if (deck) {
    const { pairs } = await store.getResource("deckpairs").get(uid);
    response.end(JSON.stringify({ ...deck, pairs }));
    return;
  }

  notFound(response);
}

async function onDeckList(_request, response, params) {
  const list = await store.getResource("deck").list();
  response.end(JSON.stringify(list || []));
}

async function onDeckSave(request, response, _args, params) {
  const json = await readJson(request);
  if (!json?.name || !Array.isArray(json?.pairs)) {
    response.writeHead(400, "Bad request").end();
    return;
  }

  const { name, title = '', language, pairs } = json;
  const uid = hash(name);
  let deck = null;

  try {
    deck = await store.getResource("deck").get(uid);
  } catch {}

  if (deck && !params.overwrite) {
    response.writeHead(409, "Exists").end();
    return;
  }

  await store
    .getResource("deck")
    .set(uid, { name, title: title.slice(0, 128), language, created: new Date().toISOString() });

  await store.getResource("deckpairs").set(uid, { pairs });

  response.end('{"ok": true}');
}

async function onSaveFavorites(_request, response, params) {
  const [front, back] = params.pair.split(":");
  await store
    .getResource("favorites")
    .set(hash(params.pair), [
      decodeURIComponent(front),
      decodeURIComponent(back),
    ]);
  response.end('{"ok": true}');
}

async function onLoadFavorites(_request, response) {
  const pairs = await store.getResource("favorites").list();
  const deck = {
    name: "Favorites",
    language: "en",
    pairs,
  };

  response.end(JSON.stringify(deck));
}

async function onRemoveFavorites(_request, response, params) {
  await store.getResource("favorites").remove(hash(params.pair));
  response.end();
}

const routes = {
  "GET /deck/:name": onDeckLoad,
  "GET /deck": onDeckList,
  "POST /deck": onDeckSave,
  "PUT /deck": (r, s, t, a) => onDeckSave(r, s, t, { ...a, overwrite: true }),

  "GET /fav": onLoadFavorites,
  "POST /fav/:pair": onSaveFavorites,
  "DELETE /fav/:pair": onRemoveFavorites,
};

createServer(router(routes));
