import { Router } from "express";
import { logout, resetPassword, signup } from "../controllers/auth.js";
import { login } from "../controllers/auth.js";
import { authenticate } from "../middleware/index.js";
const router = Router()

router.get("/demo",(req,res)=>{
    res.json({
        message:"hello world"
    }).status(201)
})
router.post("/signup",signup)
router.post("/login",login)
router.post('/logout', authenticate, logout);
router.post('/resetpassword',authenticate,resetPassword)

export {router}