import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiResponse } from "../utils/apiResponse.js"
import { apiError } from "../utils/apiError.js"
import { Like } from "../models/like.models.js"
import { Video } from "../models/video.models.js"
import { Tweet } from "../models/tweet.models.js";
import { Comment } from "../models/comment.models.js";

const toggleVideoLike = asyncHandler( async (req, res) => {
    const {videoId} = req.params
    const user = req.user

    if(!isValidObjectId(videoId)){
        throw new apiError(404, "Video not found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404, "Video not found")
    }

    const filter = {
        likedBy: user._id,
        username: user.username,
        video: videoId
    }
    const like = await Like.findOne(filter)
    
    if(like){
        await like.deleteOne()
        return res
            .status(200)
            .json(new apiResponse(200, null, "Video unliked successfully"))
    }
    else{
        await Like.create(filter)
        return res
            .status(200)
            .json(new apiResponse(200, null, "Video liked successfully"))
    }
})

const toggleTweetLike = asyncHandler( async (req, res) => {
    const {tweetId} = req.params
    const user = req.user

    if(!isValidObjectId(tweetId)){
        throw new apiError(404, "Tweet not found")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404, "Tweet not found") 
    }

    const filter = {
        likedBy: user._id,
        username: user.username,
        tweet: tweetId
    }
    const like = await Like.findOne(filter)

    if(like){
        await like.deleteOne()
        return res
            .status(200)
            .json(new apiResponse(200, null, "Tweet unliked successfully"))
    }
    else{
        await Like.create(filter)
        return res
            .status(200)
            .json(new apiResponse(200, null, "Tweet liked successfully"))
    }
})

const toggleCommentLike = asyncHandler( async (req, res) => {
    const {commentId} = req.params
    const user = req.user

    if(!isValidObjectId(commentId)){
        throw new apiError(404, "Comment not found")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new apiError(404, "Comment not found")
    }

    const filter = {
        likedBy: user._id,
        username: user.username,
        comment: commentId
    }
    const like = await Like.findOne(filter)
    
    if(like){
        await like.deleteOne()
        return res
            .status(200)
            .json(new apiResponse(200, null, "Comment unliked successfully"))
    }
    else{
        await Like.create(filter)
        return res
            .status(200)
            .json(new apiResponse(200, null, "Comment liked successfully"))
    }

})

const getLikedVideos = asyncHandler( async (req, res) => {
    const userId = req.user._id

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos"
            }
        },
        {   
            // TODO: remove this lookup and likedby username from the $project as well as its only coded for testing to understand which user has liked the video in the response 
            $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "likedBy"
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $unwind: "$likedBy"
        },
        {
            $project: {
                _id: "$likedVideos._id",
                title: "$likedVideos.title",
                description: "$likedVideos.description",
                likedBy: "$likedBy.username",
                createdAt: "$likedVideos.createdAt",
                updatedAt: "$likedVideos.updatedAt"
            }
        }
    ])

    return res
    .status(200)
    .json(new apiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    getLikedVideos
};