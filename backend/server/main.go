package main

import (
	"context"
	"log"
	"net"
	"sync"

	pb "go-grpc-chat/proto"

	"google.golang.org/grpc"
)

type chatServer struct {
	pb.UnimplementedChatServiceServer
	mu      sync.Mutex
	streams map[string]pb.ChatService_ChatStreamServer
}

func newServer() *chatServer {
	return &chatServer{
		streams: make(map[string]pb.ChatService_ChatStreamServer),
	}
}

func (s *chatServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	// Simple auth: accept any non-empty username/password
	if req.Username == "" || req.Password == "" {
		return &pb.LoginResponse{Success: false, Message: "Username and password required"}, nil
	}
	return &pb.LoginResponse{Success: true, Message: "Login successful!"}, nil
}

func (s *chatServer) ChatStream(stream pb.ChatService_ChatStreamServer) error {
	var username string
	for {
		msg, err := stream.Recv()
		if err != nil {
			s.mu.Lock()
			delete(s.streams, username)
			s.mu.Unlock()
			return err
		}
		if username == "" {
			username = msg.Username
			s.mu.Lock()
			s.streams[username] = stream
			s.mu.Unlock()
		}
		// Broadcast to all connected clients
		s.mu.Lock()
		for user, sstream := range s.streams {
			if user != username {
				sstream.Send(&pb.ChatMessage{
					Username: msg.Username,
					Message:  msg.Message,
				})
			}
		}
		s.mu.Unlock()
	}
}

func main() {
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterChatServiceServer(grpcServer, newServer()) // ✅ Register here!

	log.Println("Server is running on port 50051...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
