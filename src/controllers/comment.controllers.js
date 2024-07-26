import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js"
import { Tweet } from "../models/tweet.models.js";

const createVideoComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    const owner = req.user

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (!content || content.trim() === "") {
        throw new apiError(400, "Content cannot be empty");
    }

    const comment = await Comment.create({
        owner: owner._id,
        username: owner.username,
        video: video._id,
        content: content.trim()
    })

    return res
        .status(200)
        .json(new apiResponse(200, comment, "comment created successfully"))
})

const createTweetComment = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new apiError(404, "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    if (!content || !content.trim()) {
        throw new apiError(400, "content cannot be empty")
    }

    const comment = await Comment.create({
        owner: req.user._id,
        tweet: tweet._id,
        content: content.trim()
    })

    return res
        .status(200)
        .json(new apiResponse(200, comment, "comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!isValidObjectId(commentId)) {
        throw new apiError(404, "Comment not found")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new apiError(404, "Comment not found")
    }

    if (!comment.owner.equals(req.user._id)) {
        throw new apiError(400, "Unauthorized request!")
    }

    if (!content || !content.trim()) {
        throw new apiError(401, "Content can not be empty")
    }

    comment.content = content
    await comment.save()

    return res
        .status(200)
        .json(new apiResponse(200, comment, "comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new apiError(404, "comment not found")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new apiError(404, "comment not found")
    }

    if (!comment.owner.equals(req.user._id)) {
        throw new apiError(400, "Unathorized request")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new apiResponse(200, {}, "comment deleted successfully"))
})

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Invalid videoId")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found")
    }

    const videoComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    username: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, videoComments, "fetched video comments successfully"))

})

const getTweetComments = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new apiError(404, "Invalid tweetId")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new apiError(404, "Tweet not found")
    }

    const tweetComments = await Comment.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: {
                    username: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, tweetComments, "fetched tweet comments successfully"))
})

export {
    createVideoComment,
    createTweetComment,
    updateComment,
    deleteComment,
    getTweetComments,
    getVideoComments
}