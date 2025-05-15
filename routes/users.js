import { Router } from "express";

const router = Router()

router.get("/demo",(req,res)=>{
    res.json({
        message:"hello world"
    }).status(201)
})

export {router}