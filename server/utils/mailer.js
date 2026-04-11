const nodemailer = require("nodemailer");

// Create transporter for gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

//Send order to bakery
async function sendOrderToBakery(order, items) {
  const itemsText = items
    .map(
      (item) =>
        `- ${item.product_name} (Qty: ${item.quantity}) - $${item.price}`
    )
    .join("\n");

  await transporter.sendMail({
    from: `"Homa's Bakery" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Order Request Received",
    text: `
New Order Request:

Name: ${order.customer_name}
Email: ${order.email}
Phone: ${order.phone}

Pickup Date: ${order.pickup_date}
Type: ${order.fulfillment_type}

Address:
${order.delivery_street || ""}
${order.delivery_city || ""}

Items:
${itemsText}

Instructions:
${order.special_instructions || "None"}
    `,
  });
}

//Send confirmation to the customer
async function sendOrderToCustomer(order) {
  await transporter.sendMail({
    from: `"Homa's Bakery" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: "Your Order Request Was Received",
    text: `
Hi ${order.customer_name},

We received your order request!

We will contact you shortly to confirm your order.

Thank you,
Homa's Bakery
    `,
  });
}

//Send contact message from customer to bakery
async function sendContactToBakery(contact) {
  await transporter.sendMail({
    from: `"Homa's Bakery" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Contact Message",
    text: `
New Message:

Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}

Message:
${contact.message}
    `,
  });
}

module.exports = {
  sendOrderToBakery,
  sendOrderToCustomer,
  sendContactToBakery,
};