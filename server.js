import express from "express";
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
dotenv.config()
import { connectDB } from "./config/database.js";
import { mainrouter } from "./routes/index.js";
const app = express()
app.use(express.json())
app.use(mainrouter)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Notes API Documentation"
}));
const port = process.env.PORT||3000;
app.listen(port,()=>{
    console.log("server is listening on port",port);
    connectDB()
})