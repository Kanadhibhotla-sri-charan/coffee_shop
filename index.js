const express = require("express"); // Import Express.js
const app = express(); // Create an Express app
const PORT = process.env.PORT || 3000; // Define the server port

// Middleware to serve static files
app.use(express.static("public"));
app.set("view engine", "ejs"); // Set EJS as the template engine

// Define the homepage route
app.get("/", (req, res) => {
    res.render("index"); // Render the index.ejs file
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
