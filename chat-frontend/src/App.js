import React, { useState, useRef, useEffect } from "react";

const WS_URL = "wss://chat-backend-2-dv6q.onrender.com/ws"; // ✅ updated WebSocket URL

function App() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("login");
  const [status, setStatus] = useState("");

  const ws = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const connect = async () => {
    if (!name.trim() || !password.trim()) {
      alert("Please enter both name and password.");
      return;
    }

    try {
      const res = await fetch("https://chat-backend-2-dv6q.onrender.com/login", {
        // ✅ updated login URL
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: name, password })
      });

      if (!res.ok) {
        alert("Login failed. Please check your credentials.");
        return;
      }

      const data = await res.json();
      const token = data.token;

      if (!token) {
        alert("No token received from server.");
        return;
      }

      ws.current = new WebSocket(`${WS_URL}?token=${token}`); // ✅ updated WebSocket connection

      ws.current.onopen = () => {
        setConnected(true);
        appendMessage(`✅ Connected as ${name}`, "system");
      };

      ws.current.onmessage = (event) => {
        const msg = event.data;
        if (msg.startsWith(name + ":")) {
          appendMessage(msg, "self");
        } else if (msg.includes(":")) {
          appendMessage(msg, "other");
        } else {
          appendMessage(msg, "system");
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        appendMessage("❌ Disconnected from server.", "system");
      };
    } catch (err) {
      alert("Connection error. Is the server running?");
      console.error(err);
    }
  };

  const register = async () => {
    if (!name.trim() || !password.trim()) {
      alert("Please enter both name and password.");
      return;
    }

    try {
      const res = await fetch("https://chat-backend-2-dv6q.onrender.com/register", {
        // ✅ updated register URL
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: name, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed.");
        return;
      }

      setStatus("✅ Registered successfully. You can now log in.");
      setMode("login");
    } catch (err) {
      alert("Error registering user");
      console.error(err);
    }
  };

  const sendMessage = () => {
    if (input.trim() && ws.current && ws.current.readyState === 1) {
      ws.current.send(
        JSON.stringify({
          type: "public",
          from: name,
          content: input
        })
      );
      setInput("");
    }
  };

  const appendMessage = (msg, type) => {
    setMessages((prev) => [...prev, { msg, type }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div style={styles.body}>
      <h2 style={{ color: "#333" }}>Your Chaty</h2>
      <div style={styles.container}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Name:{" "}
            <input
              style={styles.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={connected}
            />
          </label>
          <br />
          <label>
            Password:{" "}
            <input
              type="password"
              style={styles.name}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={connected}
            />
          </label>
          <br />
          {status && (
            <div style={{ color: "green", marginBottom: 6 }}>{status}</div>
          )}
          {mode === "login" ? (
            <button
              onClick={connect}
              disabled={connected}
              style={styles.button}
            >
              Login & Connect
            </button>
          ) : (
            <button onClick={register} style={styles.button}>
              Register
            </button>
          )}

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setStatus("");
            }}
            style={{ ...styles.button, background: "#aaa" }}
          >
            Switch to {mode === "login" ? "Register" : "Login"}
          </button>
        </div>

        <div id="chat" style={styles.chat} ref={chatRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.bubble,
                ...(m.type === "self"
                  ? styles.self
                  : m.type === "system"
                  ? styles.system
                  : {})
              }}
            >
              {m.msg}
            </div>
          ))}
        </div>

        <input
          id="input"
          style={styles.input}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!connected}
        />
        <button
          id="sendBtn"
          onClick={sendMessage}
          disabled={!connected}
          style={styles.button}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  body: {
    fontFamily: "Arial, sans-serif",
    background: "#f4f6fb",
    minHeight: "100vh",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  container: {
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "24px 32px 16px 32px",
    marginTop: 20,
    width: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch"
  },
  chat: {
    width: "100%",
    height: 320,
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    overflowY: "auto",
    marginBottom: 16,
    padding: 12,
    background: "#f9fafc",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  },
  bubble: {
    display: "inline-block",
    padding: "8px 14px",
    margin: "4px 0",
    borderRadius: 18,
    background: "#e3eaff",
    color: "#222",
    maxWidth: "80%",
    wordBreak: "break-word",
    alignSelf: "flex-start"
  },
  self: {
    background: "#c1eac5",
    alignSelf: "flex-end"
  },
  system: {
    background: "#ffe0b2",
    color: "#7c4700",
    fontStyle: "italic",
    alignSelf: "center"
  },
  input: {
    width: "70%",
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginRight: 8,
    fontSize: "1em",
    marginBottom: 8
  },
  name: {
    width: "50%",
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginRight: 8,
    fontSize: "1em",
    marginBottom: 8
  },
  button: {
    padding: "8px 18px",
    borderRadius: 6,
    border: "none",
    background: "#4f8cff",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1em",
    transition: "background 0.2s",
    marginBottom: 8
  }
};

export default App;
