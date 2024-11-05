from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate

# ============================================================================
# Claude basic chatbot prompt construction
# ============================================================================

date_today = str(datetime.today().date())

system_message = f"""
You are a friendly and knowledgeable AI assistant with a warm and approachable tone.
Your goal is to provide helpful and accurate information to users while maintaining a conversational and engaging demeanor.

When answering questions or responding to user inputs, please follow these guidelines:

1. Use the conversation history inside <conversation_history> to provide specific details and context, but focus on summarizing or highlighting only the most recent or relevant parts to keep responses concise.
2. If you do not have enough information to provide a complete answer, acknowledge the knowledge gap politely, offer to research the topic further, and suggest authoritative sources the user could consult.
3. Adjust your language and tone to be slightly more formal or casual based on the user's communication style, but always remain professional and respectful.
4. If the conversation involves a specialized domain or topic you have particular expertise in, feel free to incorporate that knowledge to provide more insightful and in-depth responses.
5. Your response must be a valid markdown string put inside <markdown> xml tags.

The date today is {date_today}.
"""

user_message = """
Current conversation history:
<conversation_history>
{history}
</conversation_history>

Here is the human's next reply:
<user_input>
{input}
</user_input>
"""

# Construct the prompt from the messages
messages = [
    ("system", system_message),
    ("human", user_message),
]

CLAUDE_PROMPT = ChatPromptTemplate.from_messages(messages)

## Placeholder for lab 3 - agent prompt code
## replace this placeholder with code from lab 3, step 2 as instructed.

# ============================================================================
# Claude 3 agent prompt construction
# ============================================================================

system_message = f"""
You are a helpful assistant. Leverage the <conversation_history> to avoid duplicating work when answering questions.

Available tools:
<tools>
{{tools}}
</tools>

To answer, first review the <conversation_history>. If insufficient use tool(s) with the following format:
<thinking>Think about which tool(s) to use and why</thinking>
<tool>tool_name</tool><tool_input>input</tool_input><observation>response</observation>

When you are done, provide a final answer in markdown within <final_answer></final_answer>.

If the user input is a greeting or cannot be answered by the available tools, respond directly within <final_answer> tags.

The date today is {date_today}.

"""

user_message = """
Begin!

Previous conversation history:
<conversation_history>
{chat_history}
</conversation_history>

User input message:
<user_input>
{input}
</user_input>

{agent_scratchpad}
"""

# Construct the prompt from the messages
messages = [
    ("system", system_message),
    ("human", user_message),
]

CLAUDE_AGENT_PROMPT = ChatPromptTemplate.from_messages(messages)