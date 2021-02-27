// Package Imports
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const bodyParser = require('body-parser');

// Server setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const http = require('http').createServer(app);

// ================== Twilio ==================
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const sendSMS = async (message, recipient) => {
  const twilioRes = await client.messages.create({
    body: message,
    from: process.env.TWILIO_NUM,
    statusCallback: 'https://5d11ab70603c.ngrok.io/MessageStatus',
    to: recipient,
  })
  return twilioRes
}

// ================== Socket ==================
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('connected')
  socket.on('disconnect', () => {
    console.log('disconnected');
  });
  socket.on('smsSend', (smsParams) => {
    const { message, recipient } = smsParams
    sendSMS(message, recipient)
  });
});

// ================== Endpoints ==================

// EP1: Test
app.get('/', (req, res) => {
  res.status(200).json({"message": "Alive"})
})

// EP2: Send an SMS (not in use by app)
app.post('/sendMesage', async (req, res) => {
      const { messsage, recipient } = req.body
      const sendRes = await sendSMS(messsage, recipient)
      if (sendRes.sid) {
        res.status(200).json({"message": "SMS successfully sent"});
      } else {
        res.status(400).json({"mesage": "SMS failed to send"})
      }
});

// EP3: Receive SMS status updtes from Twilio
app.post('/MessageStatus', (req, res) => {
  io.emit('messageStatus', req.body)
  res.sendStatus(200);
});

// EP4: Receive incoming SMS
app.post('/sms', (req, res) => {
  io.emit('messageReceivedStatus', req.body)
});

// ================== Listening ==================
http.listen(8000, () => {
  console.log('listening on *:8000');
});
