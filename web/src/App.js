import React, { useEffect, useState } from "react";
import "./App.css";

window.env = window.env || {}
const apiBaseUrl = window.env.API_BASEURL || "http://localhost:4000";
const hostName = window.env.HOSTNAME || 'unknown-host';

function App() {
  const [messages, setMessages] = useState([`Hello from web (${hostName})`]);

  // Fetch message from /api/hello
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setMessages([...messages, `Fetched api (${apiBaseUrl}/api/hello) from web (${hostName})`, ...data.messages]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello Docker</h1>
        <ul>
          {messages.map((message) => (
            <li style={{ textAlign: "left" }}>{message}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;