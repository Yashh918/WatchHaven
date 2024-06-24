import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        if (!user) {
            throw new apiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user detail from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const { fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
    }   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new apiResponse(201, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // get user input from client side
    // validate for empty field checks
    // check if username or email exists in db
    // validate user password 
    // access and refesh token
    // send cookie

    const { email, username, password } = req.body

    if (!username && !email) {
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggednInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    user: loggednInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new apiResponse(
                200,
                {},
                "User logged out"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new apiError(401, "unauthorized request")
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new apiError(401, "Invalid refresh token");
    }

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new apiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new apiError(401, "Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed"
            )
        )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body

    const user = await User.findById(req.user._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(400, "Invalid old password")
    }

    if (newPassword !== confirmPassword) {
        throw new apiError(400, "Passwords are not matching")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new apiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        ))

})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, username } = req.body

    if (!fullName && !email && !username) {
        throw new apiError(400, "Atleast one field is required for change")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                ...(fullName && {fullName}),
                ...(username && {username}),
                ...(email && {email})
            }
        },
        { new: true }
    ).select("-password")

     if (!user) {
        throw new apiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new apiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apiError(500, "Error while uploading avatar")
    }

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new apiError(404, "User not found")
    }

    const oldAvatarUrl = user.avatar

    user.avatar = avatar.url
    await user.save({ validateBeforeSave: false })

    if (oldAvatarUrl) {
        const oldAvatarPublicId = oldAvatarUrl.split('/').pop().split('.')[0]
        await deleteFromCloudinary(oldAvatarPublicId, "image")
    }

    const updatedUser = await User.findById(req.user._id).select("-password")

    return res
        .status(200)
        .json(new apiResponse(200, updatedUser, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover Image file not found")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiError(500, "Error while uploading cover image")
    }

    const user = await User.findById(req.user._id)

    if (!user) {
        throw new apiError(404, "User not found")
    }

    const oldCoverImageUrl = user.coverImage

    user.coverImage = coverImage.url
    await user.save({ validateBeforeSave: false })

    if (oldCoverImageUrl) {
        const oldCoverImagePublicId = oldCoverImageUrl.split('/').pop().split('.')[0]
        await deleteFromCloudinary(oldCoverImagePublicId, "image")
    }

    const updatedUser = await User.findById(req.user._id).select("-password")

    return res
        .status(200)
        .json(new apiResponse(200, updatedUser, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new apiError(400, "username not found")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?.id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new apiError(404, "Channel does not exist")
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, channel[0], "User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} 