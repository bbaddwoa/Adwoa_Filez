import db from "#db/client";

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");

async function seed() {
  // Todo
  // Insert 3 folders
  const folderNames = ["Documents", "Pictures", "Music"];
  const folderIds = [];
  for (const name of folderNames) {
    const res = await db.query(
      "INSERT INTO folders (name) VALUES ($1) RETURNING id",
      [name]
    );
    folderIds.push(res.rows[0].id);
  }

  // Insert 5 files per folder
  for (const folderId of folderIds) {
    for (let i = 1; i <= 5; i++) {
      await db.query(
        "INSERT INTO files (name, size, folder_id) VALUES ($1, $2, $3)",
        [`file${i}_folder${folderId}.txt`, 100 * i, folderId]
      );
    }
  }
}
