import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
//this middleware will verify if the user is there or not
export const verifyJWT=asyncHandler(async (req,_,next)=>{
    try{
        const token=req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ','')
        if(!token) {
            throw new ApiError(401,'Unauthorized request')
        }
    
        const decodedTokenInformation=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user=await User.findById(decodedTokenInformation?._id).select("-password -refreshToken")
        if(!user) {
            throw new ApiError(401,'Invalid access token')
        }
        req.user=user
        next()
    }catch(err){
        throw new ApiError(401,err?.message || 'Invalid access token')
    }

})