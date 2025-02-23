import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatRoom, getJoinedRoom } from "@/services/chatServices";
import { useSocket } from "@/hooks/useSocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: number;
  userId: number;
  roomName: string;
  content: string;
  createdAt: string;
  userName: string;
  profilePic: string;
}

function ChatPage() {
  const [message, setMessage] = useState("");
  const { name } = useParams();
  const [chatGroups, setChatGroups] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState<boolean>(false); // Track if history is set
  const navigate = useNavigate();
  const currentUserId = 1; // Change this when integrating authentication
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ✅ WebSocket Handling (Fix for correct order)
  const { sendMessage } = useSocket(name!, (newMessageOrHistory) => {
    if (!initialized && Array.isArray(newMessageOrHistory)) {
      // 🔹 First WebSocket history load → reverse it to correct order (oldest first)
      setMessages([...newMessageOrHistory].reverse());
      setInitialized(true);
    } else if (typeof newMessageOrHistory === "object") {
      // 🔹 New messages should be appended at the bottom
      setMessages((prev) => [...prev, newMessageOrHistory]);
    }
  });

  // ✅ Auto-scroll to the last message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch joined chat rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const rooms = await getJoinedRoom();
        setChatGroups(rooms);
        if (!rooms || rooms.length === 0) navigate("/rooms");
      } catch (error) {
        console.error("Failed to load chat rooms", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // ✅ Handle message sending
  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      userId: currentUserId,
      roomName: name!,
      content: message,
    };

    sendMessage(JSON.stringify(newMessage)); // Send message via WebSocket
    setMessage("");
  };

  // ✅ Handle group selection
  const handleGroupClick = (groupName: string) => {
    navigate(`/chat/${groupName}`);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Card className="w-64 h-full rounded-none bg-white border-r">
        <CardHeader>
          <CardTitle>Chats</CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-60px)]">
          {chatGroups?.map((group) => (
            <div
              key={group?.id}
              className="p-4 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleGroupClick(group?.name)}
            >
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={group?.profilePic} alt={group?.name} />
                  <AvatarFallback>
                    {group?.name?.slice(0, 2) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{group?.name}</p>
                  <p className="text-sm text-gray-500">@{group?.name}</p>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      {name == null || name?.trim() === "" ? (
        <div className="flex justify-center items-center flex-1 bg-white">
          <p className="text-gray-500">No chat selected</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>{name}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* ✅ Messages Displayed in Correct Order */}
              <ScrollArea className="h-[calc(100vh-200px)] px-4 py-2">
                {messages.map((msg) => (
                  <div
                    key={msg?.id}
                    className={`flex ${
                      msg?.userId === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    } my-2`}
                  >
                    {msg?.userId !== currentUserId && (
                      <Avatar className="mr-2">
                        <AvatarImage
                          src={
                            msg?.profilePic || "https://via.placeholder.com/40"
                          }
                        />
                        <AvatarFallback>
                          {msg?.userName?.slice(0, 2) || "A"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`p-3 max-w-[75%] rounded-lg ${
                        msg?.userId === currentUserId
                          ? "bg-black text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      <p className="text-sm">{msg?.content}</p>
                    </div>
                  </div>
                ))}
                {/* ✅ Always scroll to the latest message */}
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>
          </Card>
          <Separator />
          {/* ✅ Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
