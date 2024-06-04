import { apiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import jtw from "jsonwebtoken";
import { User } from "../models/user.models";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        throw new apiError(401, "Unauthorized request")
    }

    const decodedToken = await jtw.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user) {
        throw new apiError(401, "Invalid access token")
    }

    req.user = user;

    next()
})