import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import express from "express";
import type { Application } from "express";
import cors from "cors";
import connectDB from "../db/connectDB";
import authRoutes from "./authentication/auth.routes";
export const getApplication = async():Promise<Application> => {
    try {
        await connectDB();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({
        origin: "http://localhost:5173",
        credentials: true,
    }));
    app.use(clerkMiddleware());

    app.get("/api/hello",requireAuth(), (req, res) => {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.json({ message: "Hello, world!", userId });
    });

    app.get("/", (req, res) => {
        res.json({ message: "Hello, world!" });
    });
    app.use("/api/auth", authRoutes);


    return app;
}