// Reference main form elements
const orderForm = document.getElementById("order-form");
const orderStatus = document.getElementById("order-status");

// Fulfillment and delivery fields
const fulfillmentType = document.getElementById("fulfillment_type");
const deliveryFields = document.getElementById("delivery-fields");

const deliveryStreet = document.getElementById("delivery_street");
const deliveryApt = document.getElementById("delivery_apt");
const deliveryCity = document.getElementById("delivery_city");
const deliveryState = document.getElementById("delivery_state");
const deliveryPostalCode = document.getElementById("delivery_postal_code");

// Product selection and item controls
const productSelect = document.getElementById("product_name");
const itemQuantityInput = document.getElementById("item_quantity");
const addItemButton = document.getElementById("add-item-button");
const orderItemsList = document.getElementById("order-items-list");

// Policy agreement and submit button
const agreePolicyCheckbox = document.getElementById("agree_policy");
const submitButton = document.getElementById("submit-order-btn");

// Store selected order items and product data
let selectedItems = [];
let productsData = [];

/* ========================
   LOAD PRODUCT OPTIONS
======================== */

// Fetch products and populate dropdown menu
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
    console.error("Failed to load product options:", error);
  }
}

// Enable/disable submit button based on policy agreement
function updateSubmitButtonState() {
  const isChecked = agreePolicyCheckbox.checked;

  submitButton.disabled = !isChecked;
  submitButton.classList.toggle("btn-disabled", !isChecked);
}

agreePolicyCheckbox.addEventListener("change", updateSubmitButtonState);

// Show/hide delivery fields depending on fulfillment type
fulfillmentType.addEventListener("change", () => {
  const isDelivery = fulfillmentType.value === "delivery";

  deliveryFields.classList.toggle("hidden", !isDelivery);

  if (isDelivery) {
    deliveryStreet.setAttribute("required", "required");
    deliveryCity.setAttribute("required", "required");
    deliveryState.setAttribute("required", "required");
    deliveryPostalCode.setAttribute("required", "required");
  } else {
    // Remove required attributes and clear values
    [deliveryStreet, deliveryCity, deliveryState, deliveryPostalCode].forEach((field) =>
      field.removeAttribute("required")
    );

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
    orderItemsList.innerHTML = `
      <p class="empty-items-message">No items added yet.</p>
    `;
    return;
  }

  selectedItems.forEach((item, index) => {
    const row = document.createElement("div");
    row.classList.add("order-item-row");

    const lineTotal = item.quantity * item.price;

    row.innerHTML = `
      <div>
        <strong>${item.product_name}</strong>
        <span class="item-qty">
          Qty: ${item.quantity} — $${lineTotal.toFixed(2)}
        </span>
      </div>
      <button type="button" class="remove-item-btn" data-index="${index}">
        Remove
      </button>
    `;

    orderItemsList.appendChild(row);
  });

  // Attach remove button handlers
  document.querySelectorAll(".remove-item-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      selectedItems.splice(index, 1);
      renderOrderItems();
    });
  });
}

addItemButton.addEventListener("click", () => {
  const productName = productSelect.value;
  const quantity = Number(itemQuantityInput.value);

  if (!productName) {
    setError("Please select a menu item.");
    return;
  }

  if (quantity < 1) {
    setError("Quantity must be at least 1.");
    return;
  }

  const selectedProduct = productsData.find(
    (product) => product.name === productName
  );

  if (!selectedProduct) {
    setError("Selected product could not be found.");
    return;
  }

  // Add item to selected list
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

  if (formData.customer_name.length < 2) return setError("Please enter a valid full name.");
  if (!formData.email.includes("@") || !formData.email.includes(".")) return setError("Please enter a valid email.");
  if (formData.phone.length < 7) return setError("Please enter a valid phone number.");
  if (!formData.pickup_date) return setError("Please select a date.");
  if (!formData.fulfillment_type) return setError("Please select pickup or delivery.");

  if (formData.fulfillment_type === "delivery") {
    if (
      !formData.delivery_street ||
      !formData.delivery_city ||
      !formData.delivery_state ||
      !formData.delivery_postal_code
    ) {
      return setError("Please complete the delivery address.");
    }
  }

  if (formData.items.length === 0) return setError("Please add at least one item.");

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) return setError(result.error || "Something went wrong.");

    setSuccess(result.message);

    // Reset everything after success
    orderForm.reset();
    selectedItems = [];
    renderOrderItems();

    deliveryFields.classList.add("hidden");
    updateSubmitButtonState();

  } catch (error) {
    console.error("Order form submission failed:", error);
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