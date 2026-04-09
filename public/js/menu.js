// Fetch all products from the backend and render them
// into grouped menu sections by category.
async function loadProducts() {
  const container = document.getElementById("menu-container");

  // Stop early if the target container is missing
  if (!container) return;

  try {
    // Request product data from the backend
    const response = await fetch("/api/products");
    const products = await response.json();

    // Clear any existing menu content before rendering
    container.innerHTML = "";

    // If the request failed, show error message
    if (!response.ok) {
      container.innerHTML = `
        <p class="error-message">
          ${products.error || "Sorry, we couldn't load the menu right now."}
        </p>
      `;
      return;
    }

    // If there are no products, show a message
    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = `
        <p class="error-message">
          No menu items are available right now.
        </p>
      `;
      return;
    }

    const groupedProducts = {};

    products.forEach((product) => {
      const category = product.category || "other";

      if (!groupedProducts[category]) {
        groupedProducts[category] = [];
      }

      groupedProducts[category].push(product);
    });

    // Create a full section for each category group
    Object.keys(groupedProducts).forEach((category) => {
      const section = document.createElement("section");
      section.classList.add("menu-category-section");

      const heading = document.createElement("h2");
      heading.classList.add("menu-category-title");
      heading.textContent = formatCategoryName(category);

      const grid = document.createElement("div");
      grid.classList.add("menu-grid");

      // Render each product card inside the category grid
      groupedProducts[category].forEach((product) => {
        const card = document.createElement("article");
        card.classList.add("product-card", `category-${product.category}`);

        // Use uploaded product image if available.
        // Otherwise, fall back to placeholder image.
        const imagePath = product.image
          ? product.image.startsWith("uploads/")
            ? product.image
            : `images/${product.image}`
          : "images/placeholder-bakery.jpg";

        card.innerHTML = `
          <div class="product-image-wrapper">
            <img
              src="${imagePath}"
              alt="${product.name}"
              class="product-image"
              onerror="this.src='images/placeholder-bakery.jpg'"
            />
          </div>

          <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <p class="product-price">$${Number(product.price).toFixed(2)}</p>
          </div>
        `;

        grid.appendChild(card);
      });

      section.appendChild(heading);
      section.appendChild(grid);
      container.appendChild(section);
    });
  } catch (error) {
    // Handle network or unexpected runtime errors
    console.error("Failed to load products:", error);

    container.innerHTML = `
      <p class="error-message">
        Sorry, we couldn't load the menu right now.
      </p>
    `;
  }
}

// Convert raw category values into display friendly titles.
function formatCategoryName(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Load products as soon as the script runs
loadProducts();