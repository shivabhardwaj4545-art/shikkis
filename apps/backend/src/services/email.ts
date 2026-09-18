import nodemailer from 'nodemailer';

// SMTP Transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || 'ssharma636076@gmail.com',
    pass: process.env.SMTP_PASS || 'shzjalogpzdcbzrn',
  },
});

const fromName = process.env.SMTP_FROM_NAME || 'Shikkis — Curated Style';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'ssharma636076@gmail.com';

export interface OrderEmailData {
  order_number: string;
  created_at: string;
  fulfillment_type: string;
  payment_method: string;
  total_amount: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  items: Array<{
    product_name: string;
    size: string;
    color: string;
    quantity: number;
    price_at_purchase: number;
  }>;
}

/**
 * Sends order confirmation HTML email via Gmail SMTP
 */
export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  try {
    const formattedTotal = (orderData.total_amount / 100).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      style: 'currency',
      currency: 'INR',
    });

    const itemsHtml = orderData.items
      .map(
        (it) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #E8D4A0; color: #2C1810; font-family: sans-serif; font-size: 14px;">
          <strong>${it.product_name}</strong><br />
          <span style="color: #7A6A5F; font-size: 12px;">Size: ${it.size} | Color: ${it.color} | Qty: ${it.quantity}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #E8D4A0; color: #9B1B30; text-align: right; font-family: sans-serif; font-size: 14px; font-weight: bold;">
          ₹${((it.price_at_purchase * it.quantity) / 100).toLocaleString('en-IN')}
        </td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order Confirmed — Shikkis</title>
        </head>
        <body style="background-color: #FEFBF8; margin: 0; padding: 20px; font-family: 'Georgia', serif;">
          <table align="center" width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E8D4A0; border-radius: 12px; padding: 30px; border-collapse: collapse;">
            <!-- Header -->
            <tr>
              <td style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #D4AF37;">
                <h1 style="color: #9B1B30; margin: 0; font-size: 28px; font-weight: bold; font-family: serif;">SHIKKIS</h1>
                <p style="color: #7A6A5F; margin: 5px 0 0 0; font-size: 12px; font-family: sans-serif; letter-spacing: 2px; text-transform: uppercase;">Curated Indian &amp; Fusion Wear</p>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding: 25px 0 15px 0;">
                <p style="color: #2C1810; font-size: 16px; margin: 0;">Dear ${orderData.customer.fullName},</p>
                <p style="color: #7A6A5F; font-size: 14px; line-height: 1.5; font-family: sans-serif; margin-top: 8px;">
                  Thank you for shopping with Shikkis! Your order <strong style="color: #9B1B30;">#${orderData.order_number}</strong> has been successfully received and is being prepared with utmost care at our Jaipur atelier.
                </p>
              </td>
            </tr>

            <!-- Order Summary Table -->
            <tr>
              <td style="padding: 10px 0;">
                <h3 style="color: #2C1810; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #D4AF37; padding-bottom: 5px;">Order Summary</h3>
                <table width="100%" style="border-collapse: collapse;">
                  ${itemsHtml}
                </table>
              </td>
            </tr>

            <!-- Total -->
            <tr>
              <td style="padding: 20px 0; text-align: right; border-top: 2px solid #D4AF37;">
                <p style="color: #7A6A5F; margin: 0; font-size: 13px; font-family: sans-serif;">Payment Method: <strong style="color: #2C1810;">${orderData.payment_method.toUpperCase()}</strong></p>
                <p style="color: #9B1B30; margin: 6px 0 0 0; font-size: 20px; font-family: sans-serif; font-weight: bold;">
                  Total Amount: ${formattedTotal}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="text-align: center; padding-top: 25px; border-top: 1px solid #E8D4A0; color: #7A6A5F; font-size: 12px; font-family: sans-serif;">
                <p style="margin: 0;">If you have any questions, feel free to reply to this email or call us at +91 98765 43210.</p>
                <p style="margin: 8px 0 0 0;">📍 123 Textile Lane, Jaipur, Rajasthan 302001</p>
                <p style="margin: 15px 0 0 0; color: #9B1B30; font-weight: bold;">© Shikkis — Handcrafted with Love</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: orderData.customer.email,
      subject: `Order Confirmation — #${orderData.order_number} | Shikkis`,
      html: htmlContent,
    });

    console.info(`📧 Sent order confirmation email to ${orderData.customer.email} for order #${orderData.order_number}`);
    return true;
  } catch (err) {
    console.error('Failed to send order confirmation email via SMTP:', err);
    return false;
  }
}
