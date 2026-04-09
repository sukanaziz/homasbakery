// Verify whether the user has an active admin session.
// If user does not then redirect them to the admin login page.
async function checkAdminAccess() {
  try {
    const response = await fetch("/api/auth/check");
    const result = await response.json();

    if (!result.isAdmin) {
      window.location.href = "/direct_login.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to verify admin session:", error);
    window.location.href = "/direct_login.html";
    return false;
  }
}

// Fill the product form with existing product data for editing.
function populateProductForm(product) {
  document.getElementById("product-id").value = product.id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-category").value = product.category;
  document.getElementById("product-price").value = product.price;
  document.getElementById("product-description").value = product.description;

  // Clear file input because browsers do not allow setting file values manually
  document.getElementById("product-image-file").value = "";

  // Update form UI to edit
  document.getElementById("product-form-title").textContent = "Edit Product";
  document.getElementById("product-submit-button").textContent = "Update Product";
  document.getElementById("cancel-edit-button").classList.remove("hidden");
}

// Reset the product form back to "Add Product" mode.
function resetProductForm() {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";

  document.getElementById("product-form-title").textContent = "Add Product";
  document.getElementById("product-submit-button").textContent = "Add Product";
  document.getElementById("cancel-edit-button").classList.add("hidden");

  const statusElement = document.getElementById("product-form-status");
  statusElement.textContent = "";
  statusElement.className = "form-status";
}


// Get all products and render them in the admin products table.
async function loadProducts() {
  const tableBody = document.getElementById("products-table-body");

  try {
    const response = await fetch("/api/products");
    const products = await response.json();

    tableBody.innerHTML = "";

    if (!response.ok) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">${products.error || "Failed to load products."}</td>
        </tr>
      `;
      return;
    }

    if (products.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">No products yet.</td>
        </tr>
      `;
      return;
    }

    products.forEach((product) => {
      const row = document.createElement("tr");

      const imagePreview = product.image
        ? `<img src="${product.image}" alt="${product.name}" class="admin-product-thumb" />`
        : "-";

      row.innerHTML = `
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>$${Number(product.price).toFixed(2)}</td>
        <td>${imagePreview}</td>
        <td>${product.description}</td>
        <td>
          <div class="admin-action-buttons">
            <button
              type="button"
              class="edit-product-btn btn btn-secondary"
              data-id="${product.id}"
              data-name="${product.name}"
              data-category="${product.category}"
              data-price="${product.price}"
              data-description="${product.description.replace(/"/g, "&quot;")}"
            >
              Edit
            </button>

            <button
              type="button"
              class="remove-item-btn delete-product-btn"
              data-id="${product.id}"
            >
              Delete
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    // Attach edit button handlers
    document.querySelectorAll(".edit-product-btn").forEach((button) => {
      button.addEventListener("click", () => {
        populateProductForm({
          id: button.dataset.id,
          name: button.dataset.name,
          category: button.dataset.category,
          price: button.dataset.price,
          description: button.dataset.description,
        });

        window.scrollTo({
          top: document.getElementById("product-form").offsetTop - 100,
          behavior: "smooth",
        });
      });
    });

    // Attach delete button handlers
    document.querySelectorAll(".delete-product-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = button.dataset.id;
        const confirmed = window.confirm("Delete this product?");

        if (!confirmed) return;

        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!response.ok) {
            alert(result.error || "Failed to delete product.");
            return;
          }

          loadProducts();
        } catch (error) {
          console.error("Failed to delete product:", error);
          alert("Failed to delete product.");
        }
      });
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">Failed to load products.</td>
      </tr>
    `;
  }
}

// Attach form submission and cancel-edit behavior.
function setupProductForm() {
  const productForm = document.getElementById("product-form");
  const productStatus = document.getElementById("product-form-status");
  const cancelEditButton = document.getElementById("cancel-edit-button");

  if (!productForm) return;

  cancelEditButton.addEventListener("click", () => {
    resetProductForm();
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = document.getElementById("product-id").value;
    const imageFileInput = document.getElementById("product-image-file");

    const name = document.getElementById("product-name").value.trim();
    const category = document.getElementById("product-category").value.trim();
    const price = document.getElementById("product-price").value;
    const description = document.getElementById("product-description").value.trim();

    // Validate required fields before sending request
    if (!name || !category || !description || price === "") {
      productStatus.textContent = "Please fill in all required product fields.";
      productStatus.className = "form-status error-text";
      return;
    }

    // Build multipart form data for text + optional image upload
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("description", description);

    if (imageFileInput.files[0]) {
      formData.append("imageFile", imageFileInput.files[0]);
    }

    const isEditing = Boolean(productId);
    const url = isEditing ? `/api/products/${productId}` : "/api/products";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        productStatus.textContent =
          result.error || `Failed to ${isEditing ? "update" : "add"} product.`;
        productStatus.className = "form-status error-text";
        return;
      }

      resetProductForm();
      productStatus.textContent = result.message;
      productStatus.className = "form-status success-text";

      loadProducts();
    } catch (error) {
      console.error(`Failed to ${isEditing ? "update" : "add"} product:`, error);
      productStatus.textContent = `Unable to ${isEditing ? "update" : "add"} product right now.`;
      productStatus.className = "form-status error-text";
    }
  });
}
// Fetch all order requests and render them in the admin orders table.
async function loadOrders() {
  const tableBody = document.getElementById("orders-table-body");

  try {
    const response = await fetch("/api/admin/orders");
    const orders = await response.json();

    tableBody.innerHTML = "";

    if (!response.ok) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9">${orders.error || "Failed to load orders."}</td>
        </tr>
      `;
      return;
    }

    if (orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9">No orders yet.</td>
        </tr>
      `;
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");

      const itemsHtml =
        order.items && order.items.length > 0
          ? order.items
              .map((item) => {
                const lineTotal = Number(item.quantity) * Number(item.price);
                return `
                  <div>
                    ${item.product_name} — Qty: ${item.quantity} — $${lineTotal.toFixed(2)}
                  </div>
                `;
              })
              .join("")
          : "-";

      const addressHtml =
        order.fulfillment_type === "delivery"
          ? `
              <div>${order.delivery_street || ""}</div>
              ${order.delivery_apt ? `<div>${order.delivery_apt}</div>` : ""}
              <div>
                ${order.delivery_city || ""}, ${order.delivery_state || ""} ${order.delivery_postal_code || ""}
              </div>
            `
          : "-";

      row.innerHTML = `
        <td>${order.customer_name}</td>
        <td>${order.email}</td>
        <td>${order.phone || "-"}</td>
        <td>${order.pickup_date}</td>
        <td>${order.fulfillment_type || "-"}</td>
        <td>${addressHtml}</td>
        <td>${itemsHtml}</td>
        <td>${order.special_instructions || "-"}</td>
        <td>
          <button
            type="button"
            class="remove-item-btn delete-order-btn"
            data-id="${order.id}"
          >
            Delete
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    // Attach delete button handlers after rows are rendered
    document.querySelectorAll(".delete-order-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const orderId = button.dataset.id;
        const confirmed = window.confirm("Delete this order request?");

        if (!confirmed) return;

        try {
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!response.ok) {
            alert(result.error || "Failed to delete order.");
            return;
          }

          loadOrders();
        } catch (error) {
          console.error("Failed to delete order:", error);
          alert("Failed to delete order.");
        }
      });
    });
  } catch (error) {
    console.error("Failed to load orders:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9">Failed to load orders.</td>
      </tr>
    `;
  }
}

// Fetch all contact form submissions and render them in the admin contacts table.
async function loadContacts() {
  const tableBody = document.getElementById("contacts-table-body");

  try {
    const response = await fetch("/api/admin/contacts");
    const contacts = await response.json();

    tableBody.innerHTML = "";

    if (!response.ok) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">${contacts.error || "Failed to load messages."}</td>
        </tr>
      `;
      return;
    }

    if (contacts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">No messages yet.</td>
        </tr>
      `;
      return;
    }

    contacts.forEach((contact) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${contact.name}</td>
        <td>${contact.email}</td>
        <td>${contact.phone || "-"}</td>
        <td>${contact.message}</td>
        <td>${contact.created_at}</td>
        <td>
          <button
            type="button"
            class="remove-item-btn delete-contact-btn"
            data-id="${contact.id}"
          >
            Delete
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    // Attach delete button handlers after rows are rendered
    document.querySelectorAll(".delete-contact-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const contactId = button.dataset.id;
        const confirmed = window.confirm("Delete this contact message?");

        if (!confirmed) return;

        try {
          const response = await fetch(`/api/admin/contacts/${contactId}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!response.ok) {
            alert(result.error || "Failed to delete message.");
            return;
          }

          loadContacts();
        } catch (error) {
          console.error("Failed to delete contact message:", error);
          alert("Failed to delete message.");
        }
      });
    });
  } catch (error) {
    console.error("Failed to load contacts:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">Failed to load contact messages.</td>
      </tr>
    `;
  }
}

// Attach logout behavior to the logout button.
function setupLogout() {
  const logoutButton = document.getElementById("logout-button");

  if (!logoutButton) return;

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      window.location.href = "/direct_login.html";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  });
}


// Initialize the admin dashboard after verifying session access.
async function initAdminDashboard() {
  const isAllowed = await checkAdminAccess();

  if (!isAllowed) return;

  setupLogout();
  setupProductForm();
  loadProducts();
  loadOrders();
  loadContacts();
}

// Start the dashboard logic when the script loads.
initAdminDashboard();