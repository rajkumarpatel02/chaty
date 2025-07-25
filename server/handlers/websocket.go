package handlers

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type client struct {
	conn *websocket.Conn
	send chan []byte
}

var (
	clients   = make(map[*client]bool)
	broadcast = make(chan []byte)
	mutex     sync.Mutex
)

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte("your_secret_key"), nil
	})
	if err != nil || !token.Valid {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("WebSocket upgrade failed:", err)
		return
	}
	defer ws.Close()

	c := &client{conn: ws, send: make(chan []byte)}
	mutex.Lock()
	clients[c] = true
	mutex.Unlock()

	go handleMessages(c)

	for {
		_, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}
		broadcast <- msg
	}

	mutex.Lock()
	delete(clients, c)
	mutex.Unlock()
}

func handleMessages(c *client) {
	for msg := range c.send {
		c.conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func init() {
	go func() {
		for {
			msg := <-broadcast
			mutex.Lock()
			for c := range clients {
				select {
				case c.send <- msg:
				default:
					close(c.send)
					delete(clients, c)
				}
			}
			mutex.Unlock()
		}
	}()
}
