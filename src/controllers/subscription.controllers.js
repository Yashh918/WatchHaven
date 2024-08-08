import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiResponse } from "../utils/apiResponse.js"
import { apiError } from "../utils/apiError.js"
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

const toggleSubscribe = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user._id

    if(!isValidObjectId(channelId)){
        throw new apiError(404, "Channel does not exist")
    }

    if(channelId.toString() === userId.toString()){
        throw new apiError(400, "You cannot subscribe to yourself")    
    }

    const channel = await User.findById(channelId)
    if(!channel){
        throw new apiError(404, "Channel does not exist")
    }

    const filter = {
        subscriber: userId,
        channel: channelId
    }
    const subscription = await Subscription.findOne(filter)

    if(!subscription){
        await Subscription.create(filter)
        return res
            .status(200)
            .json(new apiResponse(200, null, "Subscribed to channel successfully"))
    }
    else{
        await subscription.deleteOne()
        return res
            .status(200)
            .json(new apiResponse(200, null, "Unsubscribed from channel successfully"))
    }
})

const getAllUserSubscribers = asyncHandler(async (req, res) => {
    const channelId = req.user._id

    const subscriberAggregation = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo"
            }
        },
        {
            $unwind: "$subscriberInfo"
        },
        {
            $group: {
                _id: "$channel",
                subscriberCount: {$sum: 1},
                subscribers: {$push: "$subscriberInfo"}
            }
        },
        {
            $project: {
                _id: 0,
                channel: 1,
                subscriberCount: 1,
                subscribers: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, subscriberAggregation[0], "fetched all subscribers successfully"))
})

const getAllSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user._id
    
    const channelAggregation = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelInfo"
            }
        },
        {
            $unwind: "$channelInfo"
        },
        {
            $group: {
                _id: "$subscriber",
                channelCount: {$sum: 1},
                channels: {$push: "$channelInfo"}
            }
        },
        {
            $project: {
                _id: 0,
                subscriber: 1,
                channelCount: 1,
                channels: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, channelAggregation[0], "fetched all subscribed channels successfully"))
})

export {
    toggleSubscribe,
    getAllUserSubscribers,
    getAllSubscribedChannels
}