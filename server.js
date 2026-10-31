// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = process.env.INVENTORY_FILE
    ? path.resolve(process.env.INVENTORY_FILE)
    : path.join(__dirname, 'inventory.json');

function readInventory() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeInventory(inventory) {
    fs.writeFileSync(DB_FILE, JSON.stringify(inventory, null, 2));
}

function validateProductData(product) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
        return { valid: false, message: 'A product object is required.' };
    }
    if (typeof product.name !== 'string' || product.name.trim() === '') {
        return { valid: false, message: 'Product name is required.' };
    }
    if (typeof product.quantity !== 'number' || !Number.isInteger(product.quantity) || product.quantity < 0) {
        return { valid: false, message: 'Quantity must be a whole number 0 or greater.' };
    }
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) {
        return { valid: false, message: 'Price must be 0 or greater.' };
    }
    return { valid: true };
}

app.get('/api/inventory', (req, res) => {
    res.json(readInventory());
});

app.post('/api/inventory', (req, res) => {
    const newProduct = req.body;
    const validationResult = validateProductData(newProduct);
    if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.message });
    }

    const inventory = readInventory();
    const item = {
        id: randomUUID(),
        name: newProduct.name.trim(),
        quantity: newProduct.quantity,
        price: newProduct.price
    };
    inventory.push(item);
    writeInventory(inventory);

    res.status(201).json(item);
});

app.delete('/api/inventory/:id', (req, res) => {
    const itemId = req.params.id;
    let inventory = readInventory();
    const initialLength = inventory.length;
    inventory = inventory.filter(item => item.id !== itemId);

    if (inventory.length < initialLength) {
        writeInventory(inventory);
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.put('/api/inventory/:id', (req, res) => {
    const itemId = req.params.id;
    const updatedData = req.body;

    const validationResult = validateProductData(updatedData);
    if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.message });
    }

    const inventory = readInventory();
    const itemIndex = inventory.findIndex(item => item.id === itemId);

    if (itemIndex > -1) {
        inventory[itemIndex] = {
            ...inventory[itemIndex],
            name: updatedData.name.trim(),
            quantity: updatedData.quantity,
            price: updatedData.price
        };
        writeInventory(inventory);
        res.json(inventory[itemIndex]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    const status = error.status || 500;
    if (status >= 500) {
        console.error(error);
    }
    res.status(status).json({
        message: status === 400 ? 'Invalid JSON request body.' : 'An unexpected server error occurred.'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;