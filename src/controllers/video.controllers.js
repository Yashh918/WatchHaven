import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"; ``
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    const owner = req.user

    let videoFileLocalPath
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files.videoFile[0].path
    }

    let thumbnailLocalPath
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if (!videoFileLocalPath) {
        throw new apiError(400, "Video file is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    let views
    let isPublished
    const duration = videoFile.duration

    const video = await Video.create({
        title,
        description,
        owner: owner._id,
        views,
        duration,
        isPublished,
        videoFile: videoFile.url,
        thumbnail: thumbnail?.url || ""
    })

    return res
        .status(200)
        .json(new apiResponse(200, video, "Video published successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const thumbnailLocalPath = req.file?.path

    if (!title && !description && !thumbnailLocalPath) {
        throw new apiError(400, "Atleast one field is required for update")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (title) video.title = title
    if (description) video.description = description

    let thumbnail
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if (!thumbnail.url) {
            throw new apiError(500, "Error while uploading thumbmail")
        }

        const oldThumbnailUrl = video.thumbnail
        video.thumbnail = thumbnail.url

        if (oldThumbnailUrl) {
            const oldThumbnailPublicId = oldThumbnailUrl.split("/").pop().split(".")[0]
            await deleteFromCloudinary(oldThumbnailPublicId, "image")
        }
    }

    await video.save()

    return res
        .status(200)
        .json(new apiResponse(200, video, "Video updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (video.thumbnail) {
        const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0]
        await deleteFromCloudinary(thumbnailPublicId, "image")
    }

    const videoFilePublicId = video.videoFile.split("/").pop().split(".")[0]
    await deleteFromCloudinary(videoFilePublicId, "video")

    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Video deleted successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    video.views = video.views + 1
    video.save()

    return res
        .status(200)
        .json(new apiResponse(200, video, "Video fetched successfully"))
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    const skip = (pageInt - 1) * limitInt

    let filter = {}
    if (query) {
        filter.title = { $regex: query, $options: 'i' }
    }
    if (userId) {
        filter.owner = userId
    }

    let sort = {}
    if (sortBy && sortType) {
        sort[sortBy] = sortType === "desc" ? -1 : 1
    }

    const videos = await Video.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                views: 1,
                owner: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },
        { $skip: skip },
        { $limit: limitInt },
        { $sort: sort }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, videos, "videos fetched successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(new apiResponse(200, video, "Video publish status changed successfully"))
})

/*
const viewVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new apiError(404, "video not found")
    }

    video.views = video.views + 1
    video.save() 
})
*/

export {
    publishVideo,
    updateVideo,
    deleteVideo,
    getVideoById,
    getAllVideos,
    togglePublishStatus
}