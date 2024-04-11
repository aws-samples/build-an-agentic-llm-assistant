## Goal

Refactor the Serverless LLM Assistant built previously into an agentic, i.e agent based, LLM assistant capable of using a calculator and a search engine to answer questions.

## Concepts

Update the Lambda function to create a custom LLM agent with a calculator and search engine as tools (20min)

* Here you will continue using the AWS Cloud9 IDE to refactor the AWS lambda function.
* You will understand the difference between a basic LLM assistant vs agentic LLM assistant.

Follow the instructions below to refactor the basic LLM assistant into an agentic LLM assistant and note the differences.

## Lab

Your task is to update the AWS Lambda function code to implement an agentic LLM assistant.
To achieve this, you will perform the following steps:

1. Identify the different components of the agent: agent executor, agent, agent prompt, agent tools
2. Write the agent prompt
3. Define the agent tools
4. Create the agent and agent executor

Throughout this lab, you will focus on the resources highlighted in red below, namely the Lambda function which serves as the orchestrator of the LLM assistant.

![Agentic Assistant workshop Architecture](/assets/agentic-assistant-workshop-architecture-lab-03.png)

#### Step 1: List and discuss agent components

Explained in the slides.

#### Step 2: Write the agent prompt

The agent behaviour relies on leveraging an LLM with the Reason and Act (ReAct) instruction format to define a specific prompt that triggers the LLM to decide what action it needs to take next among a list of options,
and whether it has enough information to answer a given question after a series of actions.

Your tasks is to refactor the AWS Lambda function to add the ReAct prompt following the instructions below:

1. Open the file `serverless_llm_assistant/lib/lambda-functions/agent-executor-lambda-container/agent-executor-lambda/assistant/prompts.py` in your editor. This file contain the prompt of the basic LLM assistant currently used in the AWS Lambda function
2. Add the following code which defines an LLM agent prompt with the ReAct instruction format

```python
# ============================================================================
# Claude agent prompt construction
# ============================================================================
# Inspired by and adapted from
# https://python.langchain.com/docs/modules/agents/how_to/custom_llm_agent

CLAUDE_AGENT_PROMPT_TEMPLATE = f"""\n
Human: The following is a conversation between a human and an AI assistant.
The assistant is polite, and responds to the user input and questions acurately and concisely.
The assistant remains on the topic and leverage available options efficiently.
The date today is {date_today}.

You will play the role of the assistant.
You have access to the following tools:

{{tools}}

You must reason through the question using the following format:

Question: The question found below which you must answer
Thought: you should always think about what to do
Action: the action to take, must be one of [{{tool_names}}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Remember to respond with your knowledge when the question does not correspond to any available action.

The conversation history is within the <chat_history> XML tags below, where Hu refers to human and AI refers to the assistant:
<chat_history>
{{chat_history}}
</chat_history>

Begin!

Question: {{input}}

Assistant:
{{agent_scratchpad}}
"""

CLAUDE_AGENT_PROMPT = PromptTemplate.from_template(
    CLAUDE_AGENT_PROMPT_TEMPLATE
)
```
3. Discuss the structure of this prompt with your instructor, namely:
    * How the tools are included.
    * How the ReAct instruction format looks like

#### Step 3: Define the agent tools

Here you will define what the actual tools are and how they will be integrated to the agent.

1. Open the file `serverless_llm_assistant/lib/lambda-functions/agent-executor-lambda-container/agent-executor-lambda/assistant/tools.py` in your editor. In this file, you will add the tools definition.
2. Add the following tools definition to extend the agent with ability to search with `search engine` and to do math with a dedicated `calculator`
```python
search = DuckDuckGoSearchRun()
custom_calculator = CustomCalculatorTool()

LLM_AGENT_TOOLS = [
    Tool(
        name="Search",
        func=search.invoke,
        description=(
            "Use when you need to answer questions about current events, news or people."
            " You should ask targeted questions."
        ),
    ),
    Tool(
        name="Calculator",
        func=custom_calculator,
        description=(
            "Always Use this tool when you need to answer math questions."
            " The input to Calculator can only be a valid math expression, such as 55/3."
        ),
    ),
]
```
3. Dicuss the tools with your instructor, namely:
    * The importance of the description in helping the agent identify the right tool for a specific task.


#### Step 4: Create the agent executor

Now, to bring everything together and have the agent assistant ready to be used, we need to create an agent executor.
In fact, the agent executor is a piece of deterministic python code that orchestrates how everything works together.
It triggers the calls to the LLM, and parse out its output using regular expression to match with the correct next action to take
based on the available tools names. To build this agent executor, we can rely on the langchain class `langchain.agents.AgentExecutor`.


1. To add the agent executor, open the lambda handler file in your editor from `serverless_llm_assistant/lib/lambda-functions/agent-executor-lambda-container/agent-executor-lambda/handler.py`.
2. update the file header to import the necessary dependencies by adding the following import statements:
```python
from langchain.agents import AgentExecutor, create_react_agent
from assistant.prompts import CLAUDE_AGENT_PROMPT
from assistant.tools import LLM_AGENT_TOOLS
```
3. Then, add the following helper method to the handler to create an instance of the agent executor with the correct setup:
```python
def get_agentic_chatbot_conversation_chain(
    user_input, session_id, clean_history, verbose=True
):
    message_history = DynamoDBChatMessageHistory(
        table_name=config.chat_message_history_table_name, session_id=session_id
    )
    if clean_history:
        message_history.clear()

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        chat_memory=message_history,
        ai_prefix="AI",
        # change the human_prefix from Human to something else
        # to not conflict with Human keyword in Anthropic Claude model.
        human_prefix="Hu",
        return_messages=False,
    )

    agent = create_react_agent(
        llm=claude_llm,
        tools=LLM_AGENT_TOOLS,
        prompt=CLAUDE_AGENT_PROMPT,
    )

    agent_chain = AgentExecutor.from_agent_and_tools(
        agent=agent,
        tools=LLM_AGENT_TOOLS,
        verbose=verbose,
        memory=memory,
        handle_parsing_errors="Check your output and make sure it conforms!",
    )
    return agent_chain
```
4. Finally, update the lambda `lambda_handler` function inside the same lambda `handler.py` file to expose the new agentic chat mode to users. To do this, replace the `lambda_handler` with the following
```python
def lambda_handler(event, context):
    logger.info(event)
    user_input = event["user_input"]
    session_id = event["session_id"]
    chatbot_type = event.get("chatbot_type", "basic")
    chatbot_types = ["basic", "agentic"]
    clean_history = event.get("clean_history", False)

    if chatbot_type == "basic":
        conversation_chain = get_basic_chatbot_conversation_chain(
            user_input, session_id, clean_history
        ).invoke
    elif chatbot_type == "agentic":
        conversation_chain = get_agentic_chatbot_conversation_chain(
            user_input, session_id, clean_history
        ).invoke
    else:
        return {
            "statusCode": 200,
            "response": (
                f"The chatbot_type {chatbot_type} is not supported."
                f" Please use one of the following types: {chatbot_types}"
            ),
        }

    try:
        response = conversation_chain({"input": user_input})

        if chatbot_type == "basic":
            response = response["response"]
        elif chatbot_type == "agentic":
            response = response["output"]

    except Exception:
        response = (
            "Unable to respond due to an internal issue."
            " Please try again later"
        )
        print(traceback.format_exc())

    return {"statusCode": 200, "response": response}
```

Now, run `npx cdk deploy` again to deploy the changes. Then interact with the Lambda function by asking questions and observing the behavior.