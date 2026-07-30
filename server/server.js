// server/server.js
import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import connectDB from "./src/config/db.js";

const PORT = process.env.PORT || 5000;

// Server start karne se pehle database se connect karna zaroori hai —
// warna app chalu ho jayega par har request database error dega.
// Isliye connectDB() ko await karte hain, phir hi app.listen() karte hain.
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`PowerFault AI server running on port ${PORT}`);
  });
};

startServer();