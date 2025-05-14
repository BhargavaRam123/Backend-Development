// Import the 'express' module
import express from 'express';
import { setupSwagger } from './swagger';

// Create an Express application
const app = express();

setupSwagger(app);

// Set the port number for the server
const port = 3000;
app.use(express.json())


// Start the server and listen on the specified port
app.listen(port, () => {
  // Log a message when the server is successfully running
  console.log(`Server is running on http://localhost:${port}`);
});