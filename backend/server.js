const express = require('express');
require('dotenv').config();
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

const createTransporter = async () => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.log('Error getting access token:', err);
          reject('Failed to create access token');
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    return transporter;
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw error;
  }
};

const sendMail = async (to, subject, message) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to,
      subject,
      text: message,
    };

    let emailTransporter = await createTransporter();
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully. Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error in sendMail function:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
};

const port = process.env.PORT || 3000;

app.post('/', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).send('Missing required fields: to, subject, or message');
    }

    console.log(`Attempting to send email to: ${to}, Subject: ${subject}`);
    await sendMail(to, subject, message);
    console.log('Email sent successfully!');
    res.send('Email sent successfully!');
  } catch (error) {
    console.error('Error in route handler:', error);
    res.status(500).send('Error processing request: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});