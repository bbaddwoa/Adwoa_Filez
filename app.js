import express from "express";
import db from "#db/client";

const app = express();
app.use(express.json());

// POST /folders/:id/files - create a new file in the specified folder
app.post("/folders/:id/files", async (req, res, next) => {
  try {
    const folderId = req.params.id;
    // Check if folder exists
    const folderRes = await db.query("SELECT * FROM folders WHERE id = $1", [
      folderId,
    ]);
    if (folderRes.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }
    const { name, size } = req.body;
    if (
      !name ||
      typeof name !== "string" ||
      !size ||
      typeof size !== "number"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Missing or invalid required fields: name (string), size (number)",
        });
    }

    // Create the file
    const fileRes = await db.query(
      "INSERT INTO files (name, size, folder_id) VALUES ($1, $2, $3) RETURNING *",
      [name, size, folderId]
    );
    res.status(201).json(fileRes.rows[0]);
  } catch (err) {
    // Unique constraint violation
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "File name must be unique within the folder" });
    }
    next(err);
  }
});

// GET /folders/:id - returns folder by id with files array, or 404 if not found
app.get("/folders/:id", async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const sql = `
      SELECT folders.*, COALESCE(json_agg(files) FILTER (WHERE files.id IS NOT NULL), '[]') AS files
      FROM folders
      LEFT JOIN files ON files.folder_id = folders.id
      WHERE folders.id = $1
      GROUP BY folders.id
    `;
    const { rows } = await db.query(sql, [folderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /folders - returns all folders
app.get("/folders", async (req, res, next) => {
  try {
    const sql = `SELECT * FROM folders`;
    const { rows: folders } = await db.query(sql);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// GET /files - returns all files with folder_name
app.get("/files", async (req, res, next) => {
  try {
    const sql = `
      SELECT files.*, folders.name AS folder_name
      FROM files
      JOIN folders ON files.folder_id = folders.id
    `;
    const { rows: files } = await db.query(sql);
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

export default app;
