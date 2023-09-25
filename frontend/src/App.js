import React, { useEffect, useState } from "react";
import "./App.css";

//const apiBaseUrl = process.env.REACT_APP_API_BASEURL || "http://localhost:4000";
const apiBaseUrl = window.APP_CONFIG.apiBaseUrl || "http://localhost:4000";
const hostname = window.APP_CONFIG.serverHostname;

function App() {
  const [messages, setMessages] = useState([`Hello from web (${hostname})`]);

  // Fetch message from /api/hello
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setMessages([...messages, ...data.messages]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello docker</h1>
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