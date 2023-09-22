import React, { useEffect, useState } from "react";
import "./App.css";

const apiBaseUrl = process.env.API_BASEURL || "http://localhost:4000";

function App() {
  const [message, setMessage] = useState("Hello from React");

  // Fetch message from /api/hello
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>{message}</h1>
      </header>
    </div>
  );
}

export default App;