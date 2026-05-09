import express from "express";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express'

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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
