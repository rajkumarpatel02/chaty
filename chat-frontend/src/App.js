import { useEffect, useRef, useState } from "react";
import "./App.css";

const WS_URL = "wss://chat-backend-2-dv6q.onrender.com/ws"; // ✅ updated WebSocket URL

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conn, setConn] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connect = async () => {
    try {
      const res = await fetch("https://chat-backend-2-dv6q.onrender.com/login", {
        // ✅ updated login URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        console.log("Connected to WebSocket");
        ws.send(`${username} joined the chat`);
      };
      ws.onmessage = (event) => {
        setMessages((prev) => [...prev, event.data]);
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
      setConn(ws);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  const register = async () => {
    try {
      const res = await fetch("https://chat-backend-2-dv6q.onrender.com/register", {
        // ✅ updated register URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Registration failed");
      }

      alert("Registration successful. Please login.");
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Try again.");
    }
  };

  const sendMessage = () => {
    if (conn && input.trim() !== "") {
      conn.send(`${username}: ${input}`);
      setInput("");
    }
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="auth">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <button onClick={connect}>Login</button>
            <button onClick={register}>Register</button>
          </div>
        </div>
      ) : (
        <div className="chat">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className="message">
                {msg}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
