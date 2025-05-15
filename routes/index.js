import { router } from "./users.js";
import { Router } from "express";

const mainrouter =  Router()
mainrouter.use("/user",router)

export {mainrouter}