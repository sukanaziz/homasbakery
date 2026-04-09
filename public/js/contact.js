// Get references to form and status display element
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");

// Attach submit event listener
contactForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent page reload on submit

  // Extract and trim input values
  const name = contactForm.name.value.trim();
  const email = contactForm.email.value.trim();
  const phone = contactForm.phone.value.trim();
  const message = contactForm.message.value.trim();

  // Validate name
  if (name.length < 2) {
    contactStatus.textContent = "Please enter a valid name.";
    contactStatus.className = "form-status error-text";
    return;
  }

  // Validate email 
  if (!email.includes("@") || !email.includes(".")) {
    contactStatus.textContent = "Please enter a valid email address.";
    contactStatus.className = "form-status error-text";
    return;
  }

  // Validate message length
  if (message.length < 10) {
    contactStatus.textContent = "Message must be at least 10 characters long.";
    contactStatus.className = "form-status error-text";
    return;
  }

  // Prepare data to send to backend
  const formData = {
    name,
    email,
    phone,
    message,
  };

  try {
    // Send POST request to backend
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();
    
    // If server returns error
    if (!response.ok) {
      contactStatus.textContent = result.error || "Something went wrong.";
      contactStatus.className = "form-status error-text";
      return;
    }

    // Success case
    contactStatus.textContent = result.message;
    contactStatus.className = "form-status success-text";

    // Reset form after successful submission
    contactForm.reset();

  } catch (error) {
    // Handle network/server failure
    console.error("Contact form submission failed:", error);

    contactStatus.textContent = "Unable to submit form right now.";
    contactStatus.className = "form-status error-text";
  }
});