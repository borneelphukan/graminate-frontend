import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faPaperPlane,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";

type Message = {
  sender: "user" | "bot";
  text: string;
};

const ChatWindow = () => {
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chatMessages");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { sender: "user", text: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setIsLoading(true);
    try {
      const response = await axios.post("/api/chat", { message: input });
      const botMessage: Message = {
        sender: "bot",
        text: response.data.answer,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with the chat API:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error: Could not get a response." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-20 right-6 w-100 h-120 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden">
      <div className="bg-green-100 p-4 text-white flex items-center justify-between">
        <span className="font-regular">Graminate AI</span>
        <button
          onClick={() => {
            localStorage.removeItem("chatMessages");
            setMessages([]);
          }}
          className="text-xs text-white bg-transparent hover:underline hover:text-red-200"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start text-sm ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "bot" && (
              <div className="mr-2 mt-1 text-green-200">
                <FontAwesomeIcon icon={faRobot} size="lg" />
              </div>
            )}
            <div
              className={`px-3 py-2 rounded-lg max-w-[70%] ${
                msg.sender === "user"
                  ? "bg-green-300 dark:bg-gray-700 text-dark dark:text-light"
                  : "bg-gray-500 dark:bg-gray-700 text-dark dark:text-light"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
            {msg.sender === "user" && (
              <div className="ml-2 mt-1 text-blue-200">
                <FontAwesomeIcon icon={faCircleUser} size="lg" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-gray-400 dark:border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border border-gray-400 dark:border-gray-200 text-gray-100 placeholder-gray-300 text-sm dark:bg-gray-700 dark:text-light rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-green-200"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className="bg-green-200 hover:bg-green-100 text-white px-3 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || input.trim() === ""}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
