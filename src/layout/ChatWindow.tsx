import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleArrowUp,
  faTrashAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Sparkles from "../../public/icon/Sparkles";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const axiosInstance = axios.create({ baseURL: API_URL });

axiosInstance.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

type Message = {
  sender: "user" | "bot";
  text: string;
};

type ChatWindowProps = {
  userId: string;
};

const suggestions = [
  "Fetch all leads from Contacts in CRM",
  "When is my next veterinary doctor's appointment?",
  "When should I next milk the cows?",
];

const ChatWindow = ({ userId }: ChatWindowProps) => {
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`chatMessages_${userId}`);
      setMessages(stored ? JSON.parse(stored) : []);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`chatMessages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    const userMessage: Message = { sender: "user", text: messageText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    if (!textToSend) {
      setInput("");
    }
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");

      const response = await axiosInstance.post("/llm", {
        history: updatedMessages,
        userId: userId,
        token: token,
      });

      const botMessage: Message = {
        sender: "bot",
        text: response.data.answer,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with the chat API:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Error: Could not get a response. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClearChat = () => {
    localStorage.removeItem(`chatMessages_${userId}`);
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-[80vw] h-[80vh] bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-2xl rounded-lg flex flex-col overflow-hidden">
      <header className="px-4 py-2 flex items-center justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <h1 className="text-lg text-dark font-bold dark:text-light">Graminate AI</h1>
        <div className="flex items-center">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-3 py-1.5 rounded-md"
            >
          
              Clear Chat
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-20">
            <Sparkles size={48} className="text-green-200 dark:text-light" />
            <h2 className="mt-4 mb-6 text-2xl font-semibold text-dark dark:text-light">
              How can I help today?
            </h2>
            <div className="w-full max-w-md space-y-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionPress(s)}
                  className="w-full text-left p-4 rounded-2xl bg-white dark:bg-gray-800 hover:bg-gray-500 dark:hover:bg-gray-700 shadow transition-all"
                >
                  <p className="text-dark dark:text-light">{s}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 max-w-[90%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-400 dark:bg-gray-700 flex-shrink-0">
                  {msg.sender === "bot" ? (
                    <Sparkles
                      size={18}
                      className="text-gray-600 dark:text-gray-400"
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faUser}
                      size="sm"
                      className="text-gray-100 dark:text-gray-400"
                    />
                  )}
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 max-w-[90%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  <Sparkles
                    size={18}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div className="px-4 py-2.5 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-center space-x-1 h-5">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <footer className="p-2 md:p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <textarea
            rows={1}
            placeholder="Ask Graminate AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-dark dark:text-light flex-1 border border-gray-300 dark:border-gray-600 bg-transparent rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-40"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            className="text-blue-500 disabled:text-gray-400 dark:disabled:text-gray-500"
            disabled={isLoading || input.trim() === ""}
          >
            <FontAwesomeIcon icon={faCircleArrowUp} size="2x" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
