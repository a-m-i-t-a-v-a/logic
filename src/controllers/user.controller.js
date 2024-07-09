import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async (req,res)=>{
    //get user details from frontend
    const {fullName,username,email,password}=req.body

    //validation-not empty
    if(
        [fullName,username,email,password].some((field)=>field?.trim()==='')
    ){
        throw new ApiError(400,'All fields are required')
    }

    //check if user already exists - username, email
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,'User already exists!')
    }
    console.log(req.files)
    //check for images, check for avatar
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImgLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar is required')
    }

    //upload them to cloudinary,avatar
    const avatarToCloudinary=await uploadOnCloudinary(avatarLocalPath)
    const coverImgToCloudinary=await uploadOnCloudinary(coverImgLocalPath)
    
    if(!avatarToCloudinary){
        throw new ApiError(400,'Avatar is required')
    }
    //create user object-create entry in db

    const user=await User.create({
        username:username.toLowerCase(),
        fullName,
        avatar:avatarToCloudinary.url,
        coverImage:coverImgToCloudinary?.url || '',
        email,
        password
    })

    //remove password and refresh token field from response

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    //check for user creation

    if(!createdUser){
        throw new ApiError(500,'Something went wrong from our end - the server while registering the user')
    }

    //return response else return error
    return res.status(201).json({
        status:new ApiResponse(200,createdUser,'User registed successfully')
    })
})

export {registerUser}