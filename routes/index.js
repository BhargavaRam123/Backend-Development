import { router } from "./users.js";
import { Router } from "express";
import notesrouter from "./notesroutes.js"
const mainrouter =  Router()
mainrouter.use("/user",router)
mainrouter.use("/notes",notesrouter)

export {mainrouter}