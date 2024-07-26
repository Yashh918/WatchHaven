import mongoose, { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId
        , ref: "User"
    }
    , username: {
        type: String
    }
    , video: {
        type: Schema.Types.ObjectId
        , ref: "Video"
    }
    , tweet: {
        type: Schema.Types.ObjectId
        , ref: "Tweet"
    }
    , content: {
        type: String
        , trim: true
        , required: true
    }
}, { timestamps: true })

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = model("Comment", commentSchema)