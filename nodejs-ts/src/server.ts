// Import the 'express' module
import { routes } from "./routes";
import express from "express";
// Create an Express application
const app = express();

// Set the port number for the server
const port:number = 3000;
app.use(express.json())
app.use(routes)

// Start the server and listen on the specified port
app.listen(port, () => {
  // Log a message when the server is successfully running
  console.log(`Server is running on http://localhost:${port}`);
});