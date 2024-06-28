import {Router} from "express"
import {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
} from "../controllers/tweet.controller.js"
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router()
router.use(verifyJWT)

// routes
router
    .route("/")
    .post(upload.array("images"), createTweet)
router
    .route("/:tweetId")
    .patch(upload.array("images"), updateTweet)
    .delete(deleteTweet)
router
    .route("/user/:userId")
    .get(getUserTweets)

export default router