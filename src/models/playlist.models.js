import mongoose, { Schema, model } from "mongoose";

const playlistSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId
        , ref: "User"
    }
    , videos: [
        {
            typeof: Schema.Types.ObjectId
            , ref: "Video"
        }
    ]
    , name: {
        type: String
        , required: true
    }
    , description: {
        type: String
        , required: true
    }
}, { timestamps: true })

export const Playlist = model("Playlist", playlistSchema)