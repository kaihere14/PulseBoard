import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI!);
        console.log(`[DB] MongoDB connected: ${conn.connection.host}`);

    } catch (error:unknown) {
        console.error(`[DB] Error connecting to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

export default connectDB;