const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { addonBuilder } = require("stremio-addon-sdk");

const app = express();

const LANGUAGES = [
  "hindi",
  "tamil",
  "telugu",
  "malayalam",
  "kannada",
  "bengali",
  "marathi",
  "punjabi"
];

const manifest = {
  id: "org.yesh.einthusan.multilang",
  version: "3.0.0",
  name: "Einthusan Multi-Language (Hosted)",
  description: "Multi-language Einthusan addon with global search and externalUrl streams",
  catalogs: [
    ...LANGUAGES.map(lang => ({
      type: "movie",
      id: `einthusan_${lang}`,
      name: `Einthusan – ${lang.toUpperCase()}`
    })),
    {
      type: "movie",
      id: "einthusan_search",
      name: "Einthusan – Search All Languages",
      extra: [{ name: "search", isRequired: true }]
    }
  ],
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  idPrefixes: ["einthusan"]
};

const builder = new addonBuilder(manifest);

const CACHE = {};

async function scrape(lang, query = null) {
  const url = query
    ? `https://einthusan.tv/movie/results/?lang=${lang}&query=${encodeURIComponent(query)}`
    : `https://einthusan.tv/movie/results/?lang=${lang}`;

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const movies = [];

    $(".block1").each((i, el) => {
      const title = $(el).find(".title").text().trim();
      const poster = $(el).find("img").attr("data-src");
      const link = $(el).find("a").attr("href");

      if (!title || !poster || !link) return;

      movies.push({
        id: `einthusan_${lang}_${title.replace(/\s+/g, "_")}`,
        type: "movie",
        name: title,
        poster: poster.startsWith("http") ? poster : `https:${poster}`,
        description: `A ${lang} movie from Einthusan.`,
        einthusanUrl: `https://einthusan.tv${link}`
      });
    });

    return movies;
  } catch {
    return [];
  }
}

async function getMovies(lang) {
  if (!CACHE[lang]) CACHE[lang] = await scrape(lang);
  return CACHE[lang];
}

builder.defineCatalogHandler(async args => {
  if (args.id === "einthusan_search" && args.extra?.search) {
    const q = args.extra.search.toLowerCase();
    let results = [];

    for (const lang of LANGUAGES) {
      const movies = await scrape(lang, q);
      results = results.concat(movies);
    }

    const unique = Object.values(
      results.reduce((acc, m) => {
        acc[m.name] = m;
        return acc;
      }, {})
    );

    return { metas: unique };
  }

  const lang = args.id.replace("einthusan_", "");
  const movies = await getMovies(lang);
  return { metas: movies };
});

builder.defineMetaHandler(async args => {
  const lang = args.id.split("_")[1];
  const movies = await getMovies(lang);
  return { meta: movies.find(m => m.id === args.id) || {} };
});

builder.defineStreamHandler(async args => {
  const lang = args.id.split("_")[1];
  const movies = await getMovies(lang);
  const movie = movies.find(m => m.id === args.id);

  if (!movie) return { streams: [] };

  return {
    streams: [
      {
        title: "Watch on Einthusan",
        externalUrl: movie.einthusanUrl
      }
    ]
  };
});

app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

app.use("/", (req, res) => {
  builder.getInterface().then(i => i(req, res));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
