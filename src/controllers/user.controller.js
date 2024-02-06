import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {cloudinaryUpload} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js";

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
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenght>0)
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

export {registerUser}