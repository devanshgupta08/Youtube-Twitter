import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {cloudinaryUpload} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { upload } from "../middlewares/multer.js";

const generateTokens = async(userId) =>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken};
    }
    catch{
        throw new ApiError(500,"Could not Generate Access and Refresh Token");
    }
}
const options ={
    httpOnly: true,
    secure: true
}//option made global check for error
const registerUser = asyncHandler(async(req,res)=>{
    //get user details
    const {fullName,email,username,password} = req.body
    //validation - not empty
    if([fullName,email,username,password].some((field)=>{
        field?.trim() ===""
    }))
    {
        throw new ApiError(400,"Some fields are Empty")
    }
    //check if user already exits
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser)
    {
        throw new ApiError(409,"User with same username or email exist")
    }
    //check fo images
    const avatarLocalPath = req.files?.avatar[0]?.path
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }
    let coverImageLocalPath ="";
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
    {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    //upload to cloudinary,avatar
    const avatar = await cloudinaryUpload(avatarLocalPath)
    const coverImage = await cloudinaryUpload(coverImageLocalPath)
    if(!avatar)
    {
        throw new ApiError(400,"Avatar uploading error")
    }
    //create user obj 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    //remove pwd and refres token 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //check for user creation
    if(!createdUser) {
        throw new ApiError(500,"User registration failed")
    }
    // resturn res
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"));
} )

const loginUser = asyncHandler(async(req,res)=>
{   
    const options ={
        httpOnly: true,
        secure: true
    }
    //req->body se data 
    const {email,username,password} = req.body
    if(!(username || email))
    {
        throw new ApiError(400,"Username or Email Required")
    }
    //username or email 
    const user = await User.findOne({
        $or :[{username},{email}]
    })
    //find the user
    if(!user)
    {
        throw new ApiError(404,"User not Exist")
    }
    //password check
    const isValidPassword = await user.isPasswordCorrect(password)
    if(!isValidPassword)
    {
        throw new ApiError(401,"Invalid user credentials");
    }
    //acess and refersh token 
    const {accessToken,refreshToken} = await generateTokens(user._id)
    //send cookies
    const LoggedInUser = await User.findById(user._id).select("-password -refreshToken")
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200, 
            {
                user: LoggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res) =>{
    const options ={
        httpOnly: true,
        secure: true
    }
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,"Logout Succcessfully"))
})

const refreshAcessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized request");

    }
    try{
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user)
        {
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken!==user?.refreshToken)
        {
            throw new ApiError(401,"Refresh is token is expired or used")
        }
        const {accessToken,refreshToken} = await generateTokens(user._id)

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)

        .json(
            new ApiResponse(200,{accessToken,refreshToken},"Access token refreshed")
        )
    }
    catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})
const changePassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Invalid or Old Password")
    }
    user.password = newPassword;
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Succesfully"))
})
const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user sent"))

})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!(fullName||email))
    {
        throw new ApiError(400,"Some feilds sre required to update")
    }

    const updateFields = {};
    if (fullName) {
        updateFields.fullName = fullName;
    }
    if (email) {
        updateFields.email = email;
    }

   const user = await  User.findByIdAndUpdate(
    req.user?._id,
    updateFields,
    {new:true}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})
const updateAvatar = asyncHandler(async(req,res)=>{
    console.log(req.files.avatar[0].path);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar server local path not found")
    }
    const fileLink = await cloudinaryUpload(avatarLocalPath)
    if(!fileLink.url)
    {
        throw new ApiError(400,"File Link not generated")
    }
    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar : fileLink.url
            }
        },
        {new:true}).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Updated Avatar")
    )

})
const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"Cover Image server local path not found")
    }
    const fileLink = await cloudinaryUpload(coverImageLocalPath)
    if(!fileLink.url)
    {
        throw new ApiError(400,"File Link not generated")
    }
    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage : fileLink.url
            }
        },
        {new:true}).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Updated Cover Image")
    )

})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
}