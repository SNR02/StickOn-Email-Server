const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({path: '../.env'});

const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Enable CORS for all routes
app.use(cors());

/*---------Rate Limiter------------*/
const rateLimit = require('express-rate-limit');

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 100 requests per windowMs
});

// Apply the rate limiting middleware to API calls only
app.use('/submit-form', limiter);


// Set up transporter with your email service credentials
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send email
async function sendEmail(mailOptions) {
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.toString() };
  }
}

// Endpoint to handle any form submission
app.post('/submit-form', async (req, res) => {
  const formData = req.body;
  const recipients = process.env.RECIPIENTS;

  // Constructing HTML content dynamically
  const formType = formData.formType || 'Form Submission';
  let htmlContent = `<h1>New ${formType}</h1>`;
  Object.keys(formData).forEach(key => {
    // Skip any keys that should not be included in the email body
    if (key === 'formType' || key === 'internalField' || key === 'anotherInternalField' || formData[key] === "") {
      return;
    }
    htmlContent += `<p><strong>${key}:</strong> ${formData[key]}</p>`;
  });

  const mailOptions = {
    from: `"Form Submission" <${process.env.EMAIL_USER}>`,
    to: recipients,
    subject: 'New Form Submission',
    html: htmlContent
  };

  const result = await sendEmail(mailOptions);
  if (result.success) {
    res.status(200).send('Form data sent successfully!');
  } else {
    res.status(500).send(result.error);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
