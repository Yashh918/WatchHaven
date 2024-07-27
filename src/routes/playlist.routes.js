import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js"
import {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlayListById,
    getUserPlaylists
} from "../controllers/playlist.controllers.js"

const router = Router()
router.use(verifyJWT)

// routes
router
    .route("/")
    .post(upload.none(), createPlaylist)
router
    .route("/:playlistId")
    .get(getPlayListById)
    .patch(upload.none(), updatePlaylist)
    .delete(deletePlaylist)
router
    .route("/:playlistId/video/:videoId")
    .patch(addVideoToPlaylist)
router
    .route("/:playlistId/video/:videoId/remove")
    .patch(removeVideoFromPlaylist)
router
    .route("/user/:userId")
    .get(getUserPlaylists)

export default router