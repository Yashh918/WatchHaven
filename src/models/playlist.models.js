import mongoose, { Schema, model } from "mongoose";

const playlistSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId
        , ref: "User"
        , required: true
    }
    , username: {
        type: String
    }
    , videos: [
        {
            type: Schema.Types.ObjectId
            , ref: "Video"
        }
    ]
    , name: {
        type: String
        , required: true
    }
    , description: {
        type: String
    }
}, { timestamps: true })

export const Playlist = model("Playlist", playlistSchema)