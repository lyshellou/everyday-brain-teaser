const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { ensureDatabase, listPuzzles, savePuzzle } = require("./db");

const port = process.env.PORT || 3000;

const staticFiles = {
  "/": "index.html",
  "/index.html": "index.html",
  "/admin.html": "admin.html",
  "/styles.css": "styles.css",
  "/script.js": "script.js",
  "/admin.js": "admin.js"
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath);
  const contentType = contentTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 500, { error: "Failed to read file" });
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function createServer() {
  ensureDatabase();

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && requestUrl.pathname === "/api/puzzles") {
      try {
        sendJson(response, 200, listPuzzles());
      } catch (error) {
        console.error("Failed to read puzzles from SQLite", error);
        sendJson(response, 500, { error: "Failed to load puzzles" });
      }

      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/puzzles") {
      try {
        const payload = await readJsonBody(request);
        const savedPuzzle = savePuzzle(payload);
        sendJson(response, 200, savedPuzzle);
      } catch (error) {
        const statusCode = error.message === "Invalid JSON body" ? 400 : 422;
        sendJson(response, statusCode, { error: error.message });
      }

      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const staticPath = staticFiles[requestUrl.pathname];

    if (!staticPath) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    sendFile(response, path.join(__dirname, staticPath));
  });
}

if (require.main === module) {
  const server = createServer();

  server.listen(port, () => {
    console.log(`Brain teaser app is running at http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createServer
};
