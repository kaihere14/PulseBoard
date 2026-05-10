import { Schema, model } from "mongoose";

const authSchema = new Schema({
    anonymousId: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false,
        default: "Anonymous",
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