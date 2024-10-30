"use client";

import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import ChatApp from "./components/ChatApp";
import awsconfig from "./aws-exports";

Amplify.configure(awsconfig, { ssr: true });

export default function IndexPage() {
  const formFields = {
    signUp: {
      username: {
        order: 1,
      },
      email: {
        order: 2,
      },
      password: {
        order: 3,
      },
      confirm_password: {
        order: 4,
      },
    },
  };

  return (
    <Authenticator formFields={formFields} signUpAttributes={["email"]}>
      {({ signOut, user }) => (
        <div className="min-h-screen flex flex-col justify-center items-center">
          <header className="bg-white p-4 shadow-sm shadow-gray-300 w-full flex justify-between">
            <h1 className="text-2xl pt-1 font-bold bg-gradient-to-r text-transparent from-indigo-500 to-orange-500 bg-clip-text">
              Chatty
            </h1>
            <div className="flex items-center">
              <div className="mr-4 text-gray-600 hover:text-gray-80">
                Welcome <span className="font-bold">{user?.username}</span>!
              </div>
              <button
                onClick={signOut}
                className="px-4 h-10 text-gray-600 hover:text-sky-700 hover:shadow-sm  hover:underline  focus:outline-none"
              >
                Sign out
              </button>
            </div>
          </header>
          <main className="flex-grow mt-4 flex items-center justify-center w-3/4">
            <ChatApp />
          </main>
          <footer className="bg-white p-4 shadow-sm w-full text-xs">
            <p className="text-center text-gray-600">
              &copy; {new Date().getFullYear()} Your Company, all rights
              reserved.
            </p>
            <p className="text-center text-gray-600 text-xs">
              AI answers should be verified before use.
            </p>
          </footer>
        </div>
      )}
    </Authenticator>
  );
}
