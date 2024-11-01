"use client";

import React, { useState, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ClearButton from "./ClearButton";
import SelectMode from "./SelectMode";
import DebugToggleSwitch from "./DebugToggleSwitch";

import { IconSend2 } from "@tabler/icons-react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

interface Message {
  content: string;
  isUser: boolean;
}

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [clean_history, setCleanHistory] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState(false);
  const [assistantMode, setAssistantMode] = useState<"basic" | "agentic">(
    "basic"
  );
  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedDebugMode = localStorage.getItem("debugMode");
    setDebugMode(storedDebugMode === "true");

    const storedAssistantMode = localStorage.getItem("assistantMode");
    setAssistantMode(storedAssistantMode === "agentic" ? "agentic" : "basic");
  }, []);

  const handleSendMessage = async (message: string) => {
    const defaultErrorMessage =
      "Error while preparing your answer. Check your connectivity to the backend.";
    // fetch the cognito authentication tokens to use with the API call.
    const authToken = (await fetchAuthSession()).tokens?.idToken?.toString();
    const userAttributes = await fetchUserAttributes();
    // Append the user's input message to the message container immediately
    setMessages((prevMessages) => [
      ...prevMessages,
      { content: message, isUser: true },
    ]);

    // Call the API to get the response
    const rest_api_endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT ?? "";
    try {
      const response = await fetch(rest_api_endpoint, {
        // mode: "no-cors",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken || "",
        },
        // Currently we use the cognito user.sub as a session_id
        // this needs to be updated if one wants to store multiple chats for the same user.
        body: JSON.stringify({
          user_input: message,
          session_id: userAttributes.sub,
          clean_history: clean_history,
          chatbot_type: assistantMode,
        }),
      });
      const responseData = await response.json();
      // Add the response to the messages state after receiving it
      setCleanHistory(false);
      let AIMessage: Message;
      if (responseData.errorMessage && debugMode) {
        AIMessage = {
          content: `Error: ${
            responseData.errorMessage
          }\n\nDetails: \n\n\`\`\`\n\n${JSON.stringify(
            responseData,
            null,
            2
          )}\n\n\`\`\``,
          isUser: false,
        };
      } else if (responseData.errorMessage) {
        AIMessage = { content: defaultErrorMessage, isUser: false };
      } else {
        AIMessage = { content: responseData.response, isUser: false };
      }
      setMessages((prevMessages) => [...prevMessages, AIMessage]);
    } catch {
      setMessages((prevMessages) => [
        ...prevMessages,
        { content: defaultErrorMessage, isUser: false },
      ]);
    }
  };

  // below useEffect handles automatic scroll down when the messages content
  // overflows the container.
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white px-4 pb-2 rounded-lg shadow-sm w-full">
      <div className="space-y-4">
        <div
          ref={messageContainerRef}
          className="h-[calc(100vh-260px)] px-4 overflow-hidden hover:overflow-y-scroll border-b border-gray-200"
        >
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              content={message.content}
              isUser={message.isUser}
            />
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            id="chat-message-input"
            className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
            type="text"
            placeholder="Type your message..."
            onKeyDown={(e) => {
              // send message on enter if not empty
              if (e.key === "Enter") {
                if (e.currentTarget.value !== "") {
                  handleSendMessage(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }
            }}
            autoComplete="off"
          />
          <button
            className="px-2 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-2 focus:bg-blue-600 flex items-center"
            onClick={() => {
              const inputElement = document.getElementById(
                "chat-message-input"
              ) as HTMLInputElement;
              const message = inputElement.value.trim();
              // send message on button click if not empty
              if (message !== "") {
                handleSendMessage(message);
                inputElement.value = "";
              }
            }}
          >
            Send
            <IconSend2 className="h-5 w-5 text-white ml-2" />
          </button>
        </div>
        <div className="flex justify-between mt-2 items-center w-full">
          <DebugToggleSwitch onToggle={(value) => setDebugMode(value)} />
          <SelectMode
            onClick={(mode) => {
              setAssistantMode(mode);
            }}
          />
          <ClearButton
            onClick={() => {
              // Handle clearing the conversation
              setMessages([]);
              setCleanHistory(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
