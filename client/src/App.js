import React, { useState, useEffect, useRef } from "react";
import socketIOClient from 'socket.io-client';

import logo from'./logo.png';
import './App.css';

const App = () => {
  // State
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [updates, setUpdates] = useState([]);

  const updatesRef = useRef(null);
  updatesRef.current = updates;

  // Effects
  useEffect(() => {
    const estSocket = socketIOClient("https://5d11ab70603c.ngrok.io");
    estSocket.on('messageStatus', (twilioStatus) => {
      const newUpdates = [...updatesRef.current, twilioStatus]
      setUpdates(newUpdates)
    })
    estSocket.on('messageReceivedStatus', (twilioStatus) => {
      const newUpdates = [twilioStatus]
      setUpdates(newUpdates)
    })
    setSocket(estSocket)
  }, [])

// Render 
  return (
    <div className="App">
      <header>
      <img  src={logo} alt="logo"/>
        </header>
        <div className="content-container">
          <div className="controls">
        <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type messsage"
        />
        <div>
        <div className="buttons">
        <button
        onClick={() => {setInput('');  setUpdates([]); socket.emit('smsSend', input)}}
        >Send</button>
        </div>
        </div>
        </div>
        <div className="status-updates">
        <ul>
          { updates.length > 0 ?
            updates.map((u, idx) => <li key={idx}> 
              <div className="sid">{u.SmsSid}</div>
              <div><span>Status</span>: {u.SmsStatus}</div>
              <div><span>To</span>: {u.To}</div>
              <div><span>From</span>: {u.From}</div>
              {
                u.Body ?
                <div><span>Msg</span>: {u.Body}</div>
                : <></>
              }
            </li>) : <li>Awaiting first status...</li>
          }
        </ul>
        </div>
        </div>
    </div>
  );
}

export default App;
