const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

// PostgreSQL Connection
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "coffee_inventory",
    password: "Sripost@123",
    port: 5432,
});

// Middleware
app.use(express.static("public")); // Serves static files (CSS, images, etc.)
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.set("view engine", "ejs"); // Set EJS as the template engine

// ------------------ ROUTES ------------------ //

// Home Route - Displays available coffees for customers
app.get("/", async (req, res) => {
    try {
        // Fetch only available coffees
        const result = await pool.query("SELECT name FROM coffee WHERE quantity > 0");
        res.render("index", { coffees: result.rows, message: null }); // Ensure message is always defined
    } catch (err) {
        console.error("Error fetching coffee data:", err);
        res.status(500).send("An error occurred.");
    }
});



// Order Route - Handles customer orders
app.post('/order', (req, res) => {  
    const { coffee_name, quantity } = req.body;

    // Convert quantity to an integer
    const orderQuantity = parseInt(quantity, 10);
    if (isNaN(orderQuantity) || orderQuantity <= 0) {
        return res.redirect('/?error=Invalid+order+quantity');
    }

    // Fetch coffee details
    db.oneOrNone('SELECT * FROM coffee WHERE name = $1', [coffee_name])
        .then(coffee => {
            if (!coffee) {
                return res.redirect('/?error=Coffee+not+found');
            }

            // Check if requested quantity is available
            if (orderQuantity > coffee.quantity) {
                return res.redirect(`/?error=Sorry!+Only+${coffee.quantity}+${encodeURIComponent(coffee.name)}+available`);
            }

            // Update quantity in the database
            const newQuantity = coffee.quantity - orderQuantity;
            if (newQuantity > 0) {
                return db.none('UPDATE coffee SET quantity = $1 WHERE coffee_id = $2', [newQuantity, coffee.coffee_id]);
            } else {
                return db.none('DELETE FROM coffee WHERE coffee_id = $1', [coffee.coffee_id]);
            }
        })
        .then(() => {
            res.redirect(`/?message=Your+order+for+${orderQuantity}+${encodeURIComponent(coffee_name)}+was+successfully+placed`);
        })
        .catch(error => {
            console.error('Error placing order:', error);
            res.redirect('/?error=An+unexpected+error+occurred');
        });
});





// Admin Route - Displays coffee inventory management panel
app.get("/admin", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM coffee ORDER BY name ASC");
        res.render("admin", { coffees: result.rows });
    } catch (err) {
        console.error("Error fetching coffee data:", err);
        res.status(500).send("Server error");
    }
});

// Add New Coffee Route
app.post("/admin/add", async (req, res) => {
    const { name, price, quantity } = req.body;

    try {
        await pool.query("INSERT INTO coffee (name, price, quantity) VALUES ($1, $2, $3)", [name, price, quantity]);
        res.redirect("/admin");
    } catch (err) {
        console.error("Error adding coffee:", err);
        res.status(500).send("Server error");
    }
});

// Update Coffee Quantity Route
app.post('/admin/update', async (req, res) => {
    const { coffee_id, quantity, action } = req.body;
    const qtyChange = parseInt(quantity);

    try {
        if (action === 'add') {
            await pool.query(
                `UPDATE coffee SET quantity = quantity + $1 WHERE coffee_id = $2`,
                [qtyChange, coffee_id]
            );
        } else if (action === 'remove') {
            await pool.query(
                `UPDATE coffee SET quantity = GREATEST(quantity - $1, 0) WHERE coffee_id = $2`,
                [qtyChange, coffee_id]
            );

            // Remove coffee if quantity reaches 0
            await pool.query(`DELETE FROM coffee WHERE quantity = 0`);
        }

        res.redirect('/admin');
    } catch (err) {
        console.error('Error updating coffee quantity:', err);
        res.status(500).send('Error updating coffee quantity.');
    }
});



// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
