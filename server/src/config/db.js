import mongoose from "mongoose";

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/powerfault_ai";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const connectDB = async ({ retries = 8, retryDelayMs = 1500 } = {}) => {
  const mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }

  console.error(`MongoDB connection failed: ${lastError?.message || "unknown error"}`);
  process.exit(1);
};

export default connectDB;
