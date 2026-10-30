// server.js

// 1. Import the necessary modules
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// 2. Set up Middleware
// This allows the server to parse incoming JSON data (like new inventory items)
app.use(express.json()); 
// This allows the server to serve static files (HTML, CSS, JS) from the 'public' folder
app.use(express.static('public')); 

// Path to our simple 'database' (a JSON file)
const DB_FILE = path.join(__dirname, 'inventory.json'); 

// --- Helper function to read/write inventory data ---
function readInventory() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, return an empty array
        return []; 
    }
}

function writeInventory(inventory) {
    fs.writeFileSync(DB_FILE, JSON.stringify(inventory, null, 2));
}

// --- Validation Helper Function ---
function validateProductData(product) {
    // Check if name exists
    if (!product.name || product.name.trim() === '') {
        return { valid: false, message: 'Product name is required.' };
    }
    // Check if quantity is a valid positive number
    if (product.quantity === undefined || product.quantity < 0) {
        return { valid: false, message: 'Quantity must be 0 or greater.' };
    }
    // Check if price is a valid positive number
    if (product.price === undefined || product.price < 0) {
        return { valid: false, message: 'Price must be 0 or greater.' };
    }
    return { valid: true };
}

// --- API Routes (Backend Endpoints) ---

// A. GET Route: Get all inventory items
app.get('/api/inventory', (req, res) => {
    const inventory = readInventory();
    res.json(inventory); // Send the data back as a JSON response
});

// B. POST Route: Add a new inventory item
// B. POST Route: Add a new inventory item
app.post('/api/inventory', (req, res) => {
    const newProduct = req.body; 
    
    // 1. Run Validation
    const validationResult = validateProductData(newProduct);
    if (!validationResult.valid) {
        // If invalid, stop and send error back to frontend
        return res.status(400).json({ message: validationResult.message }); 
    }
    
    // 2. If Valid, Save it
    const inventory = readInventory();
    const newId = Date.now().toString(); 
    const item = { id: newId, ...newProduct };
    
    inventory.push(item);
    writeInventory(inventory);
    
    res.status(201).json(item); 
});

// C. DELETE Route: Delete an inventory item by ID
app.delete('/api/inventory/:id', (req, res) => {
    // Get the ID from the URL path (e.g., /api/inventory/1765841814491)
    const itemId = req.params.id; 
    let inventory = readInventory();
    
    // Filter the array to keep only items whose ID does NOT match the requested ID
    const initialLength = inventory.length;
    inventory = inventory.filter(item => item.id !== itemId);
    
    if (inventory.length < initialLength) {
        writeInventory(inventory); // Save the updated list
        // 204 No Content is a common success response for DELETE
        res.status(204).send(); 
    } else {
        // 404 Not Found if the ID didn't match any item
        res.status(404).json({ message: 'Item not found' }); 
    }
});

// D. PUT Route: Update an existing inventory item
app.put('/api/inventory/:id', (req, res) => {
    const itemId = req.params.id; 
    const updatedData = req.body; 

    // 1. Run Validation
    const validationResult = validateProductData(updatedData);
    if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.message }); 
    }

    // 2. If Valid, Update it
    let inventory = readInventory();
    const itemIndex = inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex > -1) {
        inventory[itemIndex] = { 
            ...inventory[itemIndex],
            ...updatedData           
        };
        writeInventory(inventory);
        res.json(inventory[itemIndex]);
    } else {
        res.status(404).json({ message: 'Item not found' }); 
    }
});
// 4. Start the Server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log('Open this link in your web browser!');
});