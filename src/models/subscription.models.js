import mongoose, { Schema, model } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId
        , ref: "User"
    }
    , channel: {
        type: Schema.Types.ObjectId
        , ref: "User"
    }
}
    , { timestamps: true })

export const subscription = model("Subscription", subscriptionSchema)