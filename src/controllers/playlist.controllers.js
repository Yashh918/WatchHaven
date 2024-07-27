import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description = "" } = req.body;
  const owner = req.user

  if (!name) {
    throw new apiError(400, "Playlist name is required");
  }

  const playlist = await Playlist.create({
    owner: owner._id,
    username: owner.username,
    name,
    description
  });

  if (!playlist) {
    throw new apiError(500, "Error creating playlist");
  }

  return res
    .status(201)
    .json(new apiResponse(201, playlist, "Playlist created successfully"));
});

const getPlayListById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!isValidObjectId(playlistId)) {
    throw new apiError(404, "playlist not found")
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId)
      }
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'videos',
        foreignField: '_id',
        as: 'videos'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails'
      }
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        ownerDetails: {
          _id: 1,
          username: 1,
          avatar: 1
        }
      }
    }
  ])
  if (playlist.length === 0) {
    throw new apiError(404, "playlist not found")
  }

  return res
    .status(200)
    .json(new apiResponse(200, playlist[0], "Playlist fetched successfully"))

});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params
  const { name, description } = req.body

  if (!isValidObjectId(playlistId)) {
    throw new apiError(404, "playlist not found")
  }

  const playlist = await Playlist.findById(playlistId)
  if (!playlist) {
    throw new apiError(404, "playlist not found")
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new apiError(403, "Unauthorized request! You can update only your playlist")
  }

  if (!name && !description) {
    throw new apiError(400, "Atleast name or description is required for update")
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        ...(name && { name }),
        ...(description && { description })
      }
    },
    {
      new: true
    }
  )

  return res
    .status(200)
    .json(new apiResponse(200, updatedPlaylist, "Playlist updated successfully"))
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!isValidObjectId(playlistId)) {
    throw new apiError(404, "playlist not found")
  }

  const playlist = await Playlist.findById(playlistId)
  if (!playlist) {
    throw new apiError(404, "playlist not found")
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new apiError(403, "Unathorized reqeust! You can delete only your playlist")
  }

  await Playlist.findByIdAndDelete(playlistId)

  return res
    .status(200)
    .json(new apiResponse(200, {}, "playlist deleted successfully"))

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(404, "Invalid playlist or video Id")
  }

  const playlist = await Playlist.findById(playlistId)
  if (!playlist) {
    throw new apiError(404, "Playlist not found")
  }

  const video = await Video.findById(videoId)
  if (!video) {
    throw new apiError(404, "Video not found")
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new apiError(403, "Unathorized reqeust! You can add videos to only your playlist")
  }

  if(playlist.videos.includes(video._id)){
    throw new apiError(400, "Video already in playlist")
  }

  playlist.videos.push(video._id)
  await playlist.save()

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Video added to playlist successfully"))

});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(404, "Invalid playlist or video Id")
  }

  const playlist = await Playlist.findById(playlistId)
  if (!playlist) {
    throw new apiError(404, "Playlist not found")
  }

  const video = await Video.findById(videoId)
  if (!video) {
    throw new apiError(404, "Video not found")
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new apiError(403, "Unathorized reqeust! You can remove videos from only your playlist")
  }

  const videoIndex = playlist.videos.findIndex((video) => video.equals(videoId))
  if(videoIndex === -1){
    throw new apiError(404, "Video not found in playlist")
  }

  playlist.videos.splice(videoIndex, 1)
  await playlist.save()

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Video removed from playlist successfully"))
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params

  if (!isValidObjectId(userId)) {
    throw new apiError(404, "Invalid user Id")
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new apiError(404, "User not found")
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails'
      }
    },
    {
      $unwind: "$ownerDetails"
    },
    {
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        ownerDetails: {
          _id: 1,
          username: 1,
          avatar: 1
        }
      }
    }
  ])

  if(playlists.length === 0){
    throw new apiError(404, "User playlist not found")
  }

  return res
    .status(200)
    .json(new apiResponse(200, playlists, "User playlists fetched successfully"))
});

export {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getPlayListById,
  getUserPlaylists,
};
