import { Router } from "express";
import {
    toggleSubscribe,
    getAllUserSubscribers,
    getAllSubscribedChannels
} from "../controllers/subscription.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()
router.use(verifyJWT)

// routes
router
    .route("/channel/:channelId")
    .post(toggleSubscribe)
router
    .route("/subscribers")
    .get(getAllUserSubscribers)
router
    .route("/channels")
    .get(getAllSubscribedChannels)

export default router