package main

import (
    "bufio"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strings"

    "github.com/gorilla/websocket"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    fmt.Print("Enter your name: ")
    name, _ := reader.ReadString('\n')
    name = strings.TrimSpace(name)
    if name == "" {
        fmt.Println("Name cannot be empty.")
        return
    }

    // Fetch JWT token
    resp, err := http.Get("http://localhost:8080/login?username=" + name)
    if err != nil {
        log.Fatal("Failed to get JWT:", err)
    }
    defer resp.Body.Close()
    var data struct {
        Token string `json:"token"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        log.Fatal("Failed to decode JWT response:", err)
    }

    // Connect to WebSocket with JWT
    wsURL := "ws://localhost:8080/ws?token=" + data.Token
    conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    if err != nil {
        log.Fatal("Dial error:", err)
    }
    defer conn.Close()

    // Goroutine to read messages
    go func() {
        for {
            _, message, err := conn.ReadMessage()
            if err != nil {
                log.Println("Read error:", err)
                return
            }
            fmt.Println(string(message))
        }
    }()

    // Read from stdin and send to server
    fmt.Println("Type messages and press Enter to send:")
    scanner := bufio.NewScanner(os.Stdin)
    for scanner.Scan() {
        text := scanner.Text()
        if text == "" {
            continue
        }
        msg := fmt.Sprintf("%s: %s", name, text)
        err := conn.WriteMessage(websocket.TextMessage, []byte(msg))
        if err != nil {
            log.Println("Write error:", err)
            break
        }
    }
}