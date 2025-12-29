import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB_NAME || "bhajan-crm";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    if (!client) {
      // Validate URI format
      if (!uri || uri.trim() === "") {
        throw new Error("MONGODB_URI environment variable is not set or is empty");
      }

      // Log connection attempt (without sensitive info)
      const uriForLogging = uri.includes("@") 
        ? uri.split("@")[0].split("://")[0] + "://***@" + uri.split("@")[1]
        : uri;
      console.log(`Attempting to connect to MongoDB: ${uriForLogging}`);

      client = new MongoClient(uri);
      await client.connect();
      console.log("Connected to MongoDB successfully");
    }

    db = client.db(dbName);
    return db;
  } catch (error: any) {
    console.error("Database connection error:", error);
    
    // Provide more helpful error messages
    if (error.code === "ENOTFOUND") {
      const hostname = error.hostname || "unknown";
      throw new Error(
        `MongoDB connection failed: Cannot resolve hostname "${hostname}". ` +
        `Please check your MONGODB_URI environment variable. ` +
        `For MongoDB Atlas, ensure your connection string is complete and in the format: ` +
        `mongodb+srv://username:password@cluster.mongodb.net/dbname`
      );
    }
    
    if (error.message?.includes("authentication failed")) {
      throw new Error(
        `MongoDB authentication failed. Please check your username and password in MONGODB_URI.`
      );
    }

    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("Disconnected from MongoDB");
  }
}
