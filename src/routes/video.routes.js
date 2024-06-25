import { Router } from "express";
import {
    publishVideo,
    updateVideo,
    deleteVideo,
    getVideoById,
    getAllVideos,
    togglePublishStatus
} from "../controllers/video.controllers.js"
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()
router.use(verifyJWT)

// routes
router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([{name: "videoFile", maxCount: 1},{name: "thumbnail", maxCount: 1}]),
        publishVideo
    )
router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo)
router
    .route("/toggle/publish/:videoId")
    .patch(togglePublishStatus)
    
export default router