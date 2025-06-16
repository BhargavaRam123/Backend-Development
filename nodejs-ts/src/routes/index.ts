import express from "express";
import { defaultRoute } from "./defaultRoute";
export const routes = express.Router()
routes.use(defaultRoute)