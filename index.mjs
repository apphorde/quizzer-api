import router from "micro-router";
import { Store } from "./store.mjs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

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
  const deck = await store.getResource("deck").get(params.uid);

  if (deck) {
    response.end(JSON.stringify(deck));
    return;
  }

  notFound(response);
}

async function onDeckSave(request, response) {
  const json = await readJson(request);
  if (!json?.name || !Array.isArray(json?.pairs)) {
    response.writeHead(400, "Bad request").end();
    return;
  }

  const uid = hash(json.name);
  const deck = await store.getResource("deck").get(uid);

  if (deck) {
    response.writeHead(409, "Exists").end();
    return;
  }
}

async function onSaveFavorites(_request, response, params) {
  const [front, back] = params.pair.split(",");
  await store.getResource("favorites").set(hash(params.pair), [front, back]);
  response.end("OK");
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
  "GET /deck/:uid": onDeckLoad,
  "POST /deck": onDeckSave,

  "GET /fav": onLoadFavorites,
  "POST /fav/:pair": onSaveFavorites,
  "DELETE /fav/:pair": onRemoveFavorites,
};

const port = process.env.PORT;
createServer(router(routes)).listen(port, () => {
  console.log("Started API on port " + port);
});
