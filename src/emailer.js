// require('dotenv').config(); // Ensure this is at the top

// const express = require('express');
// const nodemailer = require('nodemailer');
// const bodyParser = require('body-parser');
// const cors = require('cors');

// const app = express();

// // Middleware to parse form data
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// // Enable CORS for all routes
// app.use(cors());

// // Verify environment variables
// console.log('Email User:', process.env.EMAIL_USER);
// console.log('Email Pass:', process.env.EMAIL_PASS);

// // Set up transporter with your email service credentials
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Function to send email
// async function sendEmail(mailOptions) {
//   try {
//     let info = await transporter.sendMail(mailOptions);
//     console.log('Email sent:', info.messageId);
//     console.log('Accepted:', info.accepted);
//     console.log('Rejected:', info.rejected);
//     return { success: true };
//   } catch (error) {
//     console.error('Error sending email:', error);
//     return { success: false, error: error.toString() };
//   }
// }

// // Endpoint to handle form submission
// app.post('/submit-form', async (req, res) => {
//   const formData = req.body;
//   const recipients = process.env.RECIPIENTS;

//   // Dynamically create HTML content
//   let htmlContent = `<h1>New Form Submission from ${formData.formName}</h1>`;
//   Object.keys(formData).forEach(key => {
//     if (key !== 'formName') {
//       htmlContent += `<p><strong>${key}:</strong> ${formData[key]}</p>`;
//     }
//   });

//   const mailOptions = {
//     from: `"Form Submission" <${process.env.EMAIL_USER}>`,
//     to: recipients,
//     subject: `New ${formData.formName} Submission`,
//     html: htmlContent,
//   };

//   const result = await sendEmail(mailOptions);
//   if (result.success) {
//     res.status(200).send('Form data sent successfully!');
//   } else {
//     res.status(500).send(result.error);
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server started on http://localhost:${PORT}`);
// });


require('dotenv').config(); // Ensure this is at the top

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Enable 'trust proxy'
app.set('trust proxy', true);

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
    pass: process.env.EMAIL_PASS,
  },
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

// Endpoint to handle form submission
app.post('/submit-form', async (req, res) => {
  const formData = req.body;
  const recipients = process.env.RECIPIENTS;

  // Check if the form submission is the keep-alive request
  if (formData.formName === 'keep-alive') {
    console.log('Received keep-alive request');
    return res.status(200).send('Keep-alive request received');
  }

  // Check if formData is empty
  if (Object.keys(formData).length === 0) {
    console.log('Received empty form submission');
    return res.status(400).send('Empty form submission');
  }

  // Dynamically create HTML content
  let htmlContent = `<h1>New Form Submission from ${formData.formName}</h1>`;
  Object.keys(formData).forEach(key => {
    if (key == 'formName') {
      htmlContent = "";
    }
    else{
      htmlContent += `<p><strong>${key}:</strong> ${formData[key]}</p>`;
    }
  });

  const mailOptions = {
    from: `"Form Submission" <${process.env.EMAIL_USER}>`,
    to: recipients,
    subject: `New ${formData.formName} Submission`,
    html: htmlContent,
  };

  if(htmlContent != ""){
    const result = await sendEmail(mailOptions);
    if (result.success) {
      res.status(200).send('Form data sent successfully!');
    } else {
      res.status(500).send(result.error);
  }
  }
  
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  startKeepAlive(); // Start the keep-alive function when the server starts
});

// Keep-alive function to prevent Render instance from spinning down
function startKeepAlive() {
  const url = `https://stickon-email-server.onrender.com/submit-form`; // Replace with your Render URL
  const interval = 30000; // Interval in milliseconds (30 seconds)

  // Minimal valid form data to keep the server active without sending an email
  const formData = {
    formName: 'keep-alive',
    dummyField: 'dummyValue'
  };

  function keepAlive() {
    axios.post(url, formData)
      .then(response => {
        console.log(`Keep-alive request sent at ${new Date().toISOString()}: Status Code ${response.status}`);
      })
      .catch(error => {
        console.error(`Error sending keep-alive request at ${new Date().toISOString()}:`, error.message);
      });
  }

  setInterval(keepAlive, interval);
}
