const express = require("express");
const addon = require("stremio-addon-sdk");

const manifest = {
  id: "einthusan-multi-lang",
  version: "1.0.0",
  name: "Einthusan Multi-Language",
  description: "Multi-language Einthusan catalog addon",
  catalogs: [
    { type: "movie", id: "tamil" },
    { type: "movie", id: "telugu" },
    { type: "movie", id: "malayalam" },
    { type: "movie", id: "kannada" },
    { type: "movie", id: "hindi" },
    { type: "movie", id: "bengali" },
    { type: "movie", id: "punjabi" }
  ],
  resources: ["catalog"],
  types: ["movie"]
};

const builder = new addon.Builder(manifest);

builder.defineCatalogHandler(({ id }) => {
  return {
    metas: [
      {
        id: id + "_sample",
        name: id.toUpperCase() + " Sample Movie",
        poster: "https://via.placeholder.com/300x450?text=" + id
      }
    ]
  };
});

const app = express();
app.get("/manifest.json", (req, res) => res.json(manifest));
app.get("/:resource/:type/:id.json", addon.getRouter(builder));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
