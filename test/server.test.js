const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stockroom-test-'));
process.env.INVENTORY_FILE = path.join(temporaryDirectory, 'inventory.json');
fs.writeFileSync(process.env.INVENTORY_FILE, '[]');

const app = require('../server');
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    delete process.env.INVENTORY_FILE;
});

test('serves the app and supports validated inventory CRUD', async () => {
    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Stockroom \| Inventory/);

    const list = await fetch(`${baseUrl}/api/inventory`);
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), []);

    const invalid = await fetch(`${baseUrl}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Invalid quantity', quantity: 1.5, price: 2 })
    });
    assert.equal(invalid.status, 400);

    const createdResponse = await fetch(`${baseUrl}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'client-id', name: '  Notebook  ', quantity: 4, price: 2.5 })
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.notEqual(created.id, 'client-id');
    assert.deepEqual({ name: created.name, quantity: created.quantity, price: created.price }, {
        name: 'Notebook',
        quantity: 4,
        price: 2.5
    });

    const updatedResponse = await fetch(`${baseUrl}/api/inventory/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'changed-id', name: 'Journal', quantity: 8, price: 3 })
    });
    assert.equal(updatedResponse.status, 200);
    const updated = await updatedResponse.json();
    assert.equal(updated.id, created.id);
    assert.equal(updated.name, 'Journal');

    const deletedResponse = await fetch(`${baseUrl}/api/inventory/${created.id}`, { method: 'DELETE' });
    assert.equal(deletedResponse.status, 204);
    const missingResponse = await fetch(`${baseUrl}/api/inventory/${created.id}`, { method: 'DELETE' });
    assert.equal(missingResponse.status, 404);
    const finalList = await fetch(`${baseUrl}/api/inventory`);
    assert.deepEqual(await finalList.json(), []);
});
