import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
    createTweetComment,
    createVideoComment,
    deleteComment,
    getTweetComments,
    getVideoComments,
    updateComment
} from "../controllers/comment.controllers.js";

const router = Router()
router.use(verifyJWT)

// routes
router
    .route("/video/:videoId")
    .post(upload.none(), createVideoComment)
    .get(getVideoComments)
router
    .route("/tweet/:tweetId")
    .post(upload.none(), createTweetComment)
    .get(getTweetComments)
router
    .route("/:commentId")
    .patch(upload.none(), updateComment)
    .delete(deleteComment)

export default router