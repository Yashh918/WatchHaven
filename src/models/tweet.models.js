import mongoose, { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const tweetSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId
        , ref: "User"
    }
    , username: {
        type: String
    }
    , content: {
        type: String
        , required: true
    }
    , images: {
        type: [String]
    }
}, { timestamps: true })

tweetSchema.plugin(mongooseAggregatePaginate)

export const Tweet = model("Tweet", tweetSchema)