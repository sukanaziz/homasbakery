// Get main form and status elements
const orderForm = document.getElementById("order-form");
const orderStatus = document.getElementById("order-status");

// Fulfillment and delivery elements
const fulfillmentType = document.getElementById("fulfillment_type");
const deliveryFields = document.getElementById("delivery-fields");

const deliveryStreet = document.getElementById("delivery_street");
const deliveryApt = document.getElementById("delivery_apt");
const deliveryCity = document.getElementById("delivery_city");
const deliveryState = document.getElementById("delivery_state");
const deliveryPostalCode = document.getElementById("delivery_postal_code");

// Product and item controls
const productSelect = document.getElementById("product_name");
const itemQuantityInput = document.getElementById("item_quantity");
const addItemButton = document.getElementById("add-item-button");
const orderItemsList = document.getElementById("order-items-list");

// Policy and submit
const agreePolicyCheckbox = document.getElementById("agree_policy");
const submitButton = document.getElementById("submit-order-btn");

// State
let selectedItems = [];
let productsData = [];

// Fetch products and populate dropdown
async function loadProductOptions() {
  try {
    const response = await fetch("/api/products");
    const products = await response.json();

    if (!response.ok || !Array.isArray(products)) {
      throw new Error("Invalid product data");
    }

    productsData = products;

    productSelect.innerHTML = `<option value="">Select an item</option>`;

    products.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = `${product.name} — $${Number(product.price).toFixed(2)}`;
      productSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

// Enable submit only if policy is accepted
function updateSubmitButtonState() {
  submitButton.disabled = !agreePolicyCheckbox.checked;
}

agreePolicyCheckbox.addEventListener("change", updateSubmitButtonState);

// Show/hide delivery fields dynamically
fulfillmentType.addEventListener("change", () => {
  const isDelivery = fulfillmentType.value === "delivery";

  deliveryFields.classList.toggle("hidden", !isDelivery);

  deliveryStreet.required = isDelivery;
  deliveryCity.required = isDelivery;
  deliveryState.required = isDelivery;
  deliveryPostalCode.required = isDelivery;

  // Clear values when switching back to pickup
  if (!isDelivery) {
    deliveryStreet.value = "";
    deliveryApt.value = "";
    deliveryCity.value = "";
    deliveryState.value = "";
    deliveryPostalCode.value = "";
  }
});

// Display selected items in UI
function renderOrderItems() {
  orderItemsList.innerHTML = "";

  if (selectedItems.length === 0) {
    orderItemsList.innerHTML = `<p>No items added yet.</p>`;
    return;
  }

  selectedItems.forEach((item, index) => {
    const row = document.createElement("div");
    row.classList.add("order-item-row");

    const lineTotal = item.quantity * item.price;

    row.innerHTML = `
      <div>
        <strong>${item.product_name}</strong>
        <span>Qty: ${item.quantity} — $${lineTotal.toFixed(2)}</span>
      </div>
      <button type="button" class="remove-item-btn" data-index="${index}">
        Remove
      </button>
    `;

    // Remove item handler
    row.querySelector("button").addEventListener("click", () => {
      selectedItems.splice(index, 1);
      renderOrderItems();
    });

    orderItemsList.appendChild(row);
  });
}

addItemButton.addEventListener("click", () => {
  const productName = productSelect.value;
  const quantity = Number(itemQuantityInput.value);

  if (!productName || quantity < 1) {
    setError("Select a valid item and quantity.");
    return;
  }

  const selectedProduct = productsData.find(
    (p) => p.name === productName
  );

  if (!selectedProduct) {
    setError("Selected product not found.");
    return;
  }

  selectedItems.push({
    product_name: productName,
    quantity,
    price: Number(selectedProduct.price),
  });

  renderOrderItems();

  // Reset inputs
  productSelect.value = "";
  itemQuantityInput.value = 1;

  clearStatus();
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = {
    customer_name: orderForm.customer_name.value.trim(),
    email: orderForm.email.value.trim(),
    phone: orderForm.phone.value.trim(),
    pickup_date: orderForm.pickup_date.value,
    fulfillment_type: orderForm.fulfillment_type.value,
    delivery_street: deliveryStreet.value.trim(),
    delivery_apt: deliveryApt.value.trim(),
    delivery_city: deliveryCity.value.trim(),
    delivery_state: deliveryState.value.trim(),
    delivery_postal_code: deliveryPostalCode.value.trim(),
    special_instructions: orderForm.special_instructions.value.trim(),
    items: selectedItems,
  };

  // Basic validation
  if (selectedItems.length === 0) {
    return setError("Add at least one item.");
  }

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      return setError(result.error || "Failed to submit order.");
    }

    setSuccess("Order submitted successfully!");

    // Reset form and state
    orderForm.reset();
    selectedItems = [];
    renderOrderItems();

    deliveryFields.classList.add("hidden");
    updateSubmitButtonState();

  } catch (error) {
    console.error("Order submission failed:", error);
    setError("Unable to submit order right now.");
  }
});

function setError(message) {
  orderStatus.textContent = message;
  orderStatus.className = "form-status error-text";
}

function setSuccess(message) {
  orderStatus.textContent = message;
  orderStatus.className = "form-status success-text";
}

function clearStatus() {
  orderStatus.textContent = "";
  orderStatus.className = "form-status";
}

loadProductOptions();
renderOrderItems();
updateSubmitButtonState();