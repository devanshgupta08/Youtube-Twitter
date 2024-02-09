import { Router } from "express";
import { changePassword, getCurrentUser, loginUser, logoutUser, refreshAcessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.js"
import { verifyJWT } from "../middlewares/auth.js";

const router = Router()

router.route("/register").post(
    upload.fields([{
        name: "avatar",
        maxCount: 1
    },{
        name: "coverImage",
        maxCount: 1
    }]),
    registerUser)   // route = /api/v1/users/register

router.route("/login").post(loginUser)
//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refreshtoken").post(verifyJWT,refreshAcessToken)
router.route("/changepassword").post(verifyJWT,changePassword)
router.route("/currentuser").get(verifyJWT,getCurrentUser)
router.route("/updatedetails").patch(verifyJWT,updateAccountDetails)
router.route("/update-avatar").patch(upload.fields([{
    name: "avatar",
    maxCount: 1
}]),verifyJWT,updateAvatar)
router.route("/update-cover-image").patch(upload.fields([{
    name: "coverImage",
    maxCount: 1
}]),verifyJWT,updateCoverImage)

export default router