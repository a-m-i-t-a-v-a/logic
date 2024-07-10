import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

const generateAccessAndReferenceToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }catch(err){
        throw new ApiError(500,'Something went wrong while generating refresh and access token')
    }
}

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

    /*let coverImageLoaclPath; //more traditional way 
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLoaclPath=req.files.coverImage[0].path
    }*/

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

const loginUser=asyncHandler(async (req,res)=>{
    // from req.body fetch the data
    const {username,email,password}=req.body
    //username or email 
    if(!username || !email) throw new ApiError(400,'Either email or username is required')
    //find the user
    const user=await User.findOne({
        $or:[{username,email}]
    })
    if(!user) throw new ApiError(404,`${username || email} is not registered`)
    //password check
    const isPasswordValid=await user.isPasswordCorrect(password)    
    if(!isPasswordValid) throw new ApiError(401,'Invalid user credentials')
    //access and refresh token
    const {accessToken,refreshToken}=await generateAccessAndReferenceToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    //cookie
    const options={
        httpOnly:true,
        secure:true
    }
    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json({
            statusCode:new ApiResponse(200,{
                user:loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully!"
        )
        })
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(new ApiResponse(200,{},'User logged out successfully'))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,'Unauthorized request')
    }
    try{
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,'Invalid refresh token')
        }
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,'Refresh token is expired or used')
        }
        const options={
            httpOnly:true,
            secure:true
        }   
        const {accessToken,newRefreshToken}=await generateAccessAndReferenceToken(user._id)
    
        return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken,refreshToken:newRefreshToken},
                    "Access token refreshed successfully"
                )
            )
    }catch(err){
        throw new ApiError(401,err?.message || 'Invalid refresh token')
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,'Invalid password')
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res
        .status(200)
        .json(new ApiResponse(200,{},'Password changed successfully'))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
        .status(200)
        .json(new ApiResponse(200,req.user,'Current user fetched successfully'))
})

const updateAccountDetails=asyncHandler(async (req,res)=>{
    const {fullName,email}=req.body
    if(!fullName || !email){
        throw new ApiError(400,'Please provide the fields')
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200,user,'Account details updated successfully'))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is missing')
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,'Error while uploading on avatar')
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,'Avatar changed successfully!!'))
})

const updateUserCoverImage=asyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,'Cover image file is missing')
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImageLocalPath.url){
        throw new ApiError(400,'Error while uploading cover image')
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,'Cover image updated successfully!!'))
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
    updateUserCoverImage
}