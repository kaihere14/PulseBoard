import { Schema, model } from "mongoose";

const authSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false,
        default: "",
    },
    image: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Auth = model("Auth", authSchema);

export default Auth;