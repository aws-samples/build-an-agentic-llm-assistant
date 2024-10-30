import React from "react";
import Markdown from "react-markdown";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, isUser }) => {
  const initials = isUser ? "You" : "Ai";
  // Use green for user, blue for AI
  const bgColor = isUser ? "bg-gray-500" : "bg-purple-500";

  return (
    <div className="my-4">
      {isUser ? (
        <div className="flex items-start space-x-2">
          <div
            className={`w-10 h-10 flex-shrink-0 flex items-center font-semibold justify-center ${bgColor} rounded-full text-white`}
          >
            {initials}
          </div>

          <div className="bg-gray-100 p-3 rounded-lg shadow-md flex-grow">
            <div className="text-gray-600 break-words text-wrap">
              <Markdown className="prose">{content}</Markdown>
            </div>
          </div>
          <div className="w-10 h-10"></div>
        </div>
      ) : (
        <div className="flex items-start space-x-2">
          <div className="w-10 h-10"></div>
          <div className="bg-white p-3 rounded-lg shadow-md flex-grow">
            <div className="text-gray-600 break-words text-wrap">
              <Markdown className="prose">{content}</Markdown>
            </div>
          </div>
          <div
            className={`w-10 h-10 flex-shrink-0  font-semibold flex items-center justify-center ${bgColor} rounded-full text-white`}
          >
            {initials}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
