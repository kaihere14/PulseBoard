import { clerkMiddleware } from "@clerk/express";
import express from "express";
import type { Application } from "express";
import cors from "cors";
import connectDB from "../db/connectDB";
import authRoutes from "./authentication/auth.routes";
import quizRoutes from "./quiz/quiz.routes";
export const getApplication = async():Promise<Application> => {
    try {
        await connectDB();
    } catch (error:unknown) {
        console.error(`[Server] Error connecting to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(clerkMiddleware());
    app.use(cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    }));

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/quiz", quizRoutes);

    app.get("/", (req, res) => {
        res.json({ message: "Hello, world!" });
    });

    return app;
}