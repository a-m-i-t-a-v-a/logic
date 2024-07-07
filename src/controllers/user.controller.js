import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser=asyncHandler(async (req,res)=>{
    res.status(200).json({
        message:'All good',
        data:req.body
    })
})

export {registerUser}