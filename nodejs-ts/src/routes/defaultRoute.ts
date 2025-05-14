import { Router } from "express";

export const defaultRoute = Router()

defaultRoute.get('/',(req,res)=>{
    res.send("whats up!")
})

defaultRoute.post('/calc',(req,res)=>{
    console.log("req.body value:",req.body);
    const {a,b} = req.body
    if(typeof a === 'number'&& typeof b === 'number')
    {
        res.json({
            sum :a+b,
        })
    }
    else{
        res.json({
            message:"input recieved is not in expected format",
        })
    }

})