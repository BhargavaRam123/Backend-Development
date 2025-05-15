import express from "express";
import dotenv from 'dotenv';
dotenv.config()
import { connectDB } from "./config/database.js";
import { mainrouter } from "./routes/index.js";
const app = express()
app.use(express.json())
app.use(mainrouter)
const port = process.env.PORT||3000;
app.listen(port,()=>{
    console.log("server is listening on port",port);
    connectDB()
})