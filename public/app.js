const LOW_STOCK_THRESHOLD = 5;
const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const rows = document.querySelector('#inventory-rows');
const searchInput = document.querySelector('#search');
const dialog = document.querySelector('#product-dialog');
const form = document.querySelector('#product-form');
const toast = document.querySelector('#toast');

let inventory = [];
let editingId = null;
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3200);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function updateSummary() {
  document.querySelector('#total-products').textContent = inventory.length.toLocaleString();
  document.querySelector('#total-units').textContent = inventory.reduce((sum, item) => sum + item.quantity, 0).toLocaleString();
  document.querySelector('#inventory-value').textContent = currency.format(
    inventory.reduce((sum, item) => sum + item.quantity * item.price, 0)
  );
  document.querySelector('#low-stock-count').textContent = inventory.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length.toLocaleString();
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function renderInventory() {
  updateSummary();
  rows.replaceChildren();

  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = inventory.filter(item => item.name.toLocaleLowerCase().includes(query));
  const emptyState = document.querySelector('#empty-state');
  emptyState.hidden = filtered.length > 0;
  document.querySelector('#empty-title').textContent = inventory.length === 0 ? 'No products yet' : 'No matching products';
  document.querySelector('#empty-message').textContent = inventory.length === 0
    ? 'Add a product to get your inventory started.'
    : 'Try a different search term.';
  document.querySelector('#product-count').textContent = `${filtered.length} of ${inventory.length} product${inventory.length === 1 ? '' : 's'}`;

  filtered.forEach((item, index) => {
    const row = document.createElement('tr');
    const productCell = document.createElement('td');
    const productName = document.createElement('div');
    const avatar = document.createElement('span');
    avatar.className = `product-avatar avatar-${index % 4}`;
    avatar.textContent = item.name.trim().charAt(0) || '?';
    const name = document.createElement('span');
    name.className = 'product-name-text';
    name.textContent = item.name;
    productName.className = 'product-name';
    productName.append(avatar, name);
    productCell.append(productName);
    row.append(productCell);
    row.append(createCell(item.quantity.toLocaleString()));
    row.append(createCell(currency.format(item.price)));
    row.append(createCell(currency.format(item.quantity * item.price)));

    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `stock-badge${item.quantity < LOW_STOCK_THRESHOLD ? ' low' : ''}`;
    badge.textContent = item.quantity < LOW_STOCK_THRESHOLD ? 'Low stock' : 'In stock';
    statusCell.append(badge);
    row.append(statusCell);

    const actionCell = document.createElement('td');
    const actions = document.createElement('span');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.className = 'icon-button';
    edit.type = 'button';
    edit.dataset.action = 'edit';
    edit.dataset.id = item.id;
    edit.setAttribute('aria-label', `Edit ${item.name}`);
    edit.title = 'Edit product';
    edit.textContent = '✎';
    const remove = document.createElement('button');
    remove.className = 'icon-button delete';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.dataset.id = item.id;
    remove.setAttribute('aria-label', `Delete ${item.name}`);
    remove.title = 'Delete product';
    remove.textContent = '×';
    actions.append(edit, remove);
    actionCell.append(actions);
    row.append(actionCell);
    rows.append(row);
  });
}

async function loadInventory() {
  try {
    inventory = await request('/api/inventory');
    renderInventory();
  } catch (error) {
    document.querySelector('#product-count').textContent = 'Could not load inventory';
    showToast(error.message);
  }
}

function openDialog(item) {
  editingId = item ? item.id : null;
  form.reset();
  document.querySelector('#form-error').textContent = '';
  document.querySelector('#dialog-title').textContent = item ? 'Edit product' : 'Add product';
  document.querySelector('#save-product').textContent = item ? 'Save changes' : 'Add product';
  if (item) {
    form.elements.name.value = item.name;
    form.elements.quantity.value = item.quantity;
    form.elements.price.value = item.price;
  }
  dialog.showModal();
  form.elements.name.focus();
}

document.querySelector('#add-product').addEventListener('click', () => openDialog(null));
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
searchInput.addEventListener('input', renderInventory);

form.addEventListener('submit', async event => {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  const quantity = Number(form.elements.quantity.value);
  const price = Number(form.elements.price.value);
  const errorMessage = document.querySelector('#form-error');
  if (!name || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) {
    errorMessage.textContent = 'Enter a name and valid non-negative quantity and price.';
    return;
  }

  const saveButton = document.querySelector('#save-product');
  saveButton.disabled = true;
  errorMessage.textContent = '';
  try {
    const payload = { name, quantity, price };
    if (editingId) {
      await request(`/api/inventory/${encodeURIComponent(editingId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Product updated.');
    } else {
      await request('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Product added.');
    }
    dialog.close();
    await loadInventory();
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

rows.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = inventory.find(product => product.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'edit') {
    openDialog(item);
    return;
  }
  if (!window.confirm(`Delete "${item.name}" from your inventory?`)) return;
  button.disabled = true;
  try {
    await request(`/api/inventory/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    await loadInventory();
    showToast('Product deleted.');
  } catch (error) {
    button.disabled = false;
    showToast(error.message);
  }
});

loadInventory();
