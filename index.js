// Package Imports
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const bodyParser = require('body-parser');
const axios = require('axios')
const { v4: uuidv4 } = require('uuid');

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
    statusCallback: 'https://70153e2dcc5b.ngrok.io/MessageStatus',
    to: recipient,
  });
  return twilioRes;
};

// ================== Socket ==================
const io = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('connected');
  socket.on('disconnect', () => {
    console.log('disconnected');
  });
  socket.on('smsSend', (smsParams) => {
    const { message, recipient } = smsParams;
    sendSMS(message, recipient);
  });
});

// ================== Endpoints ==================
// EP1: Test
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Alive' });
});

// EP2: Send an SMS (not in use by app)
app.post('/sendMesage', async (req, res) => {
  const { messsage, recipient } = req.body;
  const sendRes = await sendSMS(messsage, recipient);
  if (sendRes.sid) {
    res.status(200).json({ message: 'SMS successfully sent' });
  } else {
    res.status(400).json({ mesage: 'SMS failed to send' });
  }
});

// EP3: Receive SMS status updates from Twilio
app.post('/MessageStatus', (req, res) => {
  io.emit('messageStatus', req.body);
  res.sendStatus(200);
});

// EP4: Receive incoming SMS
app.post('/sms', (req, res) => {
  io.emit('messageReceivedStatus', req.body);
});

// Simulate data persistence
const bookingId = "Bsdoj324923ejdswd"
let customer;
let customerStart;
let customerEnd;
let customerTime;

// EP5: Validate Taxi Booking 
app.post('/availability', (req, res) => {
  setTimeout(() => {
    const { start, end, time, caller } = req.body
    // Implement ability to check for legitmate dateTime in the future and availability here
    const availability = true
    if(start && end && time && availability) {
      // Make request to google api to get georef then time between two
      const journeyTime = "21 minutes"
      const fare = "16 pounds"
      const fareRaw = 16
      // Decipher any known details from the number: payment mechanism etc.
      const formattedTime = `${time[0]}${time[1]}:${time[2]}${time[3]}`
      customer = caller;
      customerStart = start;
      customerEnd = end;
      customerTime = formattedTime;
      const firstTimeUser = true
      // Would be retrieved after posting the booking into the database
      res.status(200).json({ fare, fareRaw, journeyTime, firstTimeUser, bookingId })
    } else {
      res.sendStatus(400)
    }
  }, 2500);
})

// EP5: Finalise Taxi Booking 
app.post('/confirmation', async (req, res) => {
  const { bookingId } = req.body
  // Go and retrieve info from DB about the journey (stored in vars above)
  const whatsApp = await client.messages
      .create({
         from: 'whatsapp:+14155238886',
         body: `🦉 Booking Confirmation ${bookingId} - Time: ${customerTime}, Pickup: ${customerStart},  Destination: ${customerEnd}.`,
         to: `whatsapp:${customer}`
       })
  const sid = { whatsApp }
  if(sid) {
    setTimeout(() => {
      const res = await axios.post('https://c8f3ccfef11e.ngrok.io/createProxy', {"driverNumber": "+447752245206",
      "customerNumber": customer})
    }, 20000)
    res.status(200).json({ sid })
  }
})

app.post('/createService', async (req, res) => {
  const { phoneSid } = req.body
  const uniqueServiceName = `Owl_${bookingId}_${uuidv4()}_service`;
  const service = await client.proxy.services.create({ uniqueName: uniqueServiceName })
  const serviceSid = service.sid;
  const addProxyNumber = await client.proxy.services(serviceSid)
  .phoneNumbers
  .create({sid: phoneSid})
  res.status(200).json({ serviceSid })
})

app.post('/createProxy', async (req, res) => {
  // Add customer and driver to a new session
  const serviceSid = 'KSe6f28eff1dab399209c9931b9611eba2';
  const { driverNumber, customerNumber } = req.body
  const uniqueSessionName = `Owl_${bookingId}_${uuidv4()}_session`;
  try {
  const session = await client.proxy.services(serviceSid)
  .sessions
  .create({uniqueName: uniqueSessionName, mode: 'voice-only', ttl: 180})
  const  sessionSid = session.sid;
  const addDriver = await client.proxy.services(serviceSid)
            .sessions(sessionSid)
            .participants
            .create({friendlyName: 'Alice', identifier: driverNumber});
  const addCustomer = await client.proxy.services(serviceSid)
  .sessions(sessionSid)
  .participants
  .create({friendlyName: 'Customer', identifier: customerNumber});
  const proxy = addDriver.proxyIdentifier;
  // Send the proxy details to the driver and customer
  const whatsApp = await client.messages
  .create({
     from: 'whatsapp:+14155238886',
     body: `🦉 Get ready! Your driver, Alice, is nearly with you. You can reach them on ${proxy}.`,
     to: `whatsapp:${customerNumber}`
   })
  const sid = { whatsApp }
  res.status(200).json({ message: "Session created" })
  } catch {
    res.status(500).json({ message: "Session creation failed" })
  }
})

// ================== Listening ==================
http.listen(8000, () => {
  console.log('listening on *:8000');
});
