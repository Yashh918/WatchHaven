import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js";

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    const owner = req.user
    
    if(!content) {
        throw new apiError(400, "content can not be empty")
    }

    let newImages = []
    if(req.files && Array.isArray(req.files) && req.files.length > 0){
        newImages = await Promise.all(
            req.files.map(async (image) => {
                const uploadedImage = await uploadOnCloudinary(image.path)
                return uploadedImage.url 
            })
        )
    }

    const tweet = await Tweet.create({
        owner: owner._id,
        content,
        images: newImages
    })

    await tweet.save()

    return res
        .status(200)
        .json(new apiResponse(200, tweet, "tweet created successfully"  ))
})

// postman
const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const {content, deleteImages = []} = req.body

    if (!Array.isArray(deleteImages)) {
        throw new apiError(400, "deleteImages is not an array");
    }

    if(!isValidObjectId(tweetId)){
        throw new apiError(404, "tweet not found")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404, "tweet not found")
    }

    if(!tweet.owner.equals(req.user._id)){
        throw new apiError(401, "Unauthorized request! You can update only your tweets")
    }

    let newImages = []
    if(req.files && Array.isArray(req.files) && req.files.length > 0){
        newImages = await Promise.all(
            req.files.map(async (image) => {
                const uploadedImage = await uploadOnCloudinary(image.path)
                return uploadedImage.url 
            })
        )
    }

    if(!content && newImages.length === 0 && deleteImages.length === 0){
        throw new apiError(400, "Atleast one field is required for update")
    }

    if(content) tweet.content = content 

    const remainingImages = tweet.images.filter((image) => {
        return !deleteImages.includes(image)
    })

    if(deleteImages.length > 0) {
            await Promise.all(
                deleteImages.map(async (image) => {
                    const imagePublicId = image.split("/").pop().split(".")[0]
                    await deleteFromCloudinary(imagePublicId)
                })
            )
    }

    tweet.images = [...remainingImages, ...newImages]

    await tweet.save()

    return res
        .status(200)
        .json(new apiResponse(200, tweet, "tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new apiError(404, "tweet not found")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404, "tweet not found")
    }

    if(!tweet.owner.equals(req.user._id)){
        throw new apiError(401, "Unauthorized request! You can delete only your tweets")
    }

    const images = tweet.images || []
    if(images.length > 0){
        await Promise.all(
            images.map(async (image) => {
                const imagePublicId = image.split("/").pop().split(".")[0]
                await deleteFromCloudinary(imagePublicId)
            })
        )
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res
        .status(200)
        .json(new apiResponse(200, {}, "tweet deleted successfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(userId)){
        throw new apiError(404, "tweet not found")
    }

    const user = await User.findById(userId)
    if(!user){
        throw new apiError(404, "User does not exist! Invalid userId")
    }

    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)

    
    
    const aggregationPipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                content: 1,
                images: 1,
                owner: {
                    username: 1,
                    avatar: 1
                }
            }
        }
    ]

    const options = {
        page: pageInt,
        limit: limitInt
    }

    const tweets = await Tweet.aggregatePaginate(Tweet.aggregate(aggregationPipeline), options)

    return res
        .status(200)
        .json(new apiResponse(200, tweets, "user tweets fetched"))
})

export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}