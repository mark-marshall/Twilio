// Package Imports
import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from 'socket.io-client';

// Asset Imports
import logo from './logo.png';
import './App.css';

// Component
const App = () => {
  // State
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [socket, setSocket] = useState(null);
  const [updates, setUpdates] = useState([]);

  // Refs
  const updatesRef = useRef(null);
  updatesRef.current = updates;

  // Effects
  useEffect(() => {
    const estSocket = socketIOClient('https://70153e2dcc5b.ngrok.io');
    estSocket.on('messageStatus', (twilioStatus) => {
      const newTwilioStatus = { ...twilioStatus, dt: new Date().toISOString() };
      const newUpdates = [...updatesRef.current, newTwilioStatus];
      setUpdates(newUpdates);
    });
    estSocket.on('messageReceivedStatus', (twilioStatus) => {
      const newTwilioStatus = { ...twilioStatus, dt: new Date().toISOString() };
      const newUpdates = [newTwilioStatus];
      setUpdates(newUpdates);
    });
    setSocket(estSocket);
  }, []);

  // Functions
  const handleSend = () => {
    socket.emit('smsSend', { message, recipient });
    setMessage('');
    setRecipient('');
    setUpdates([]);
  };

  // Render
  return (
    <div className="App">
      <header>
        <img src={logo} alt="logo" />
      </header>
      <div className="content-container">
        <div className="controls">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
          />
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Mobile"
            type="text"
          />
          <div>
            <div className="buttons">
              <button onClick={() => handleSend()}>Send</button>
            </div>
          </div>
        </div>
        <div className="status-updates">
          <ul>
            {updates.length > 0 ? (
              updates.map((u, idx) => (
                <li key={idx}>
                  <div className="sid">{u.SmsSid}</div>
                  <div>
                    <span>Timestamp</span>: {u.dt}
                  </div>
                  <div>
                    <span>Status</span>: {u.SmsStatus}
                  </div>
                  <div>
                    <span>To</span>: {u.To}
                  </div>
                  <div>
                    <span>From</span>: {u.From}
                  </div>
                  {u.Body ? (
                    <div>
                      <span>Msg</span>: {u.Body}
                    </div>
                  ) : (
                    <></>
                  )}
                </li>
              ))
            ) : (
              <li>Awaiting first status...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
