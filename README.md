# Stockroom Inventory

A responsive inventory management app built with Node.js, Express, and vanilla JavaScript. It stores products in `inventory.json` and includes an at-a-glance dashboard, product search, low-stock indicators, and create, edit, and delete actions.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use a different port.

The app reads and writes `inventory.json` in the project directory. To use a different JSON file, set `INVENTORY_FILE` to its path. The file must contain a JSON array of products with `id`, `name`, `quantity`, and `price` fields.

## Tests

```bash
npm test
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/inventory` | List all products |
| POST | `/api/inventory` | Add a product (`name`, non-negative whole-number `quantity`, non-negative `price`) |
| PUT | `/api/inventory/:id` | Update a product |
| DELETE | `/api/inventory/:id` | Delete a product |
