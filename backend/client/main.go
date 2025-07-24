package main

import (
	"bufio"
	"context"
	"io"
	"log"
	"os"
	"strings"
	"time"

	pb "go-grpc-chat/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Connect to gRPC server
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("❌ Could not connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewChatServiceClient(conn)

	// Prompt for login
	reader := bufio.NewReader(os.Stdin)
	log.Print("Username: ")
	username, _ := reader.ReadString('\n')
	username = strings.TrimSpace(username)
	log.Print("Password: ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	loginResp, err := client.Login(context.Background(), &pb.LoginRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		log.Fatalf("\u274c Login error: %v", err)
	}
	if !loginResp.Success {
		log.Fatalf("\u274c Login failed: %s", loginResp.Message)
	}
	log.Printf("\u2705 %s", loginResp.Message)

	// Start bidirectional stream
	stream, err := client.ChatStream(context.Background())
	if err != nil {
		log.Fatalf("❌ Error starting chat stream: %v", err)
	}

	// Goroutine to receive messages from server
	go func() {
		for {
			in, err := stream.Recv()
			if err == io.EOF {
				log.Println("📴 Server closed the stream.")
				return
			}
			if err != nil {
				log.Fatalf("❌ Error receiving: %v", err)
			}
			log.Printf("📨 %s: %s", in.Username, in.Message)
		}
	}()

	// Read messages from user input and send to server
	scanner := bufio.NewScanner(os.Stdin)
	log.Println("💬 Start typing your messages:")

	for scanner.Scan() {
		text := scanner.Text()
		if text == "exit" {
			log.Println("👋 Exiting chat.")
			break
		}

		msg := &pb.ChatMessage{
			Username: username,
			Message:  text,
		}

		err := stream.Send(msg)
		if err != nil {
			log.Fatalf("❌ Error sending: %v", err)
		}
		time.Sleep(time.Millisecond * 500) // small delay to improve UX
	}

	stream.CloseSend()
}
