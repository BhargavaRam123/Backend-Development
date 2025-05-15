import { Router } from "express";
import { signup } from "../controllers/auth.js";
const router = Router()

router.get("/demo",(req,res)=>{
    res.json({
        message:"hello world"
    }).status(201)
})
router.post("/signup",signup)
export {router}