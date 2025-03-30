const { Pool } = require('pg');
const pgp = require('pg-promise')();
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Database connection setup
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'coffee_inventory', // Change this to your actual database name
    user: 'postgres',  // Your PostgreSQL username
    password: 'Sripost@123'  // Your PostgreSQL password
});

app.use(express.urlencoded({ extended: true })); // To parse form data
app.use(express.static(path.join(__dirname, 'public'))); // Serving static files

// Set view engine to EJS
app.set('view engine', 'ejs');

// ✅ Route: Homepage (Fetch available coffees)
app.get("/", async (req, res) => {
    try {
        const coffees = await db.any("SELECT * FROM coffee WHERE quantity > 0");

        // Retrieve messages from session
        const successMessage = req.session.successMessage || null;
        const errorMessage = req.session.errorMessage || null;

        console.log("✅ Messages Retrieved:", { successMessage, errorMessage });

        // Clear messages after displaying
        req.session.successMessage = null;
        req.session.errorMessage = null;

        res.render("index", { coffees, successMessage, errorMessage });
    } catch (error) {
        console.error("Error fetching coffees:", error);
        res.render("index", { coffees: [], successMessage: null, errorMessage: "Error fetching coffee data." });
    }
});



// ✅ Route: Admin Panel
app.get('/admin', async (req, res) => {
    try {
        const coffees = await db.any("SELECT * FROM coffee WHERE quantity > 0");
        res.render('admin', { coffees, message: null, errorMessage: null });
    } catch (error) {
        console.error("Error fetching admin data:", error);
        res.status(500).send("Internal server error");
    }
});

// ✅ Add Coffee
app.post("/admin/add", async (req, res) => {
    const { name, price, quantity } = req.body;

    if (!name || !price || !quantity) {
        return res.redirect("/admin?errorMessage=All fields are required.");
    }

    try {
        await db.none("INSERT INTO coffee (name, price, quantity) VALUES ($1, $2, $3)", [name, price, quantity]);

        res.redirect("/admin?successMessage=Coffee added successfully!");
    } catch (error) {
        console.error("Error adding coffee:", error);
        res.redirect("/admin?errorMessage=Failed to add coffee.");
    }
});

// ✅ Update Coffee Quantity
app.post('/admin/update', async (req, res) => {
    const { coffee_id, action } = req.body;

    try {
        if (action === 'increase') {
            await db.none('UPDATE coffee SET quantity = quantity + 1 WHERE coffee_id = $1', [coffee_id]);
        } else if (action === 'decrease') {
            await db.none('UPDATE coffee SET quantity = quantity - 1 WHERE coffee_id = $1 AND quantity > 0', [coffee_id]);
        }
        res.redirect('/admin'); // Refresh the admin panel
    } catch (err) {
        console.error('Error updating coffee quantity:', err);
        res.status(500).send('Internal Server Error');
    }
});

// ✅ Order Coffee
app.post('/order', async (req, res) => {
    try {
        const { coffee_id, quantity } = req.body;

        if (!coffee_id || !quantity || quantity <= 0) {
            req.session.errorMessage = "Invalid order request.";
            return res.redirect('/');
        }

        const coffee = await db.oneOrNone("SELECT * FROM coffee WHERE coffee_id = $1", [coffee_id]);

        if (!coffee) {
            req.session.errorMessage = "Coffee not found.";
            return res.redirect('/');
        }

        if (coffee.quantity < quantity) {
            req.session.errorMessage = "Not enough stock available.";
            return res.redirect('/');
        }

        // Update quantity
        await db.none("UPDATE coffee SET quantity = quantity - $1 WHERE coffee_id = $2", [quantity, coffee_id]);

        // ✅ Debugging: Check if success message is being set
        req.session.successMessage = "Order placed successfully!";
        console.log("✅ Success Message Set:", req.session.successMessage);

        return res.redirect('/');
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send("Internal server error");
    }
});

// ✅ Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
