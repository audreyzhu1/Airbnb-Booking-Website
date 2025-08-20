const express = require("express");
const cors = require("cors");
const { getSheetData } = require("./sheets");

const app = express();
app.use(cors());

app.get("/api/availability", async (req, res) => {
    console.log("📥 /api/availability endpoint was hit"); // 👈 Add this line
  
    try {
      const data = await getSheetData();
      console.log("✅ Returning data:", data);
      res.json(data);
    } catch (err) {
      console.error("FULL ERROR DUMP:", err);
      res.status(500).json({
        error: "Server Error",
        detail: err.message,
        stack: err.stack,
      });
    }
  });
  

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
