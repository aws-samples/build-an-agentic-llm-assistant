import boto3
from langchain.agents import Tool
from langchain_aws import BedrockLLM
from langchain_aws import ChatBedrock
from langchain_community.tools import DuckDuckGoSearchRun
from .calculator import CustomCalculatorTool
from .config import AgenticAssistantConfig
from .rag import get_rag_chain
from .sqlqa import get_sql_qa_tool, get_text_to_sql_chain

config = AgenticAssistantConfig()
bedrock_runtime = boto3.client("bedrock-runtime", region_name=config.bedrock_region)

claude_llm = BedrockLLM(
    model_id=config.llm_model_id,
    client=bedrock_runtime,
    model_kwargs={
        "max_tokens_to_sample": 1000,
        "temperature": 0.0,
        "top_p": 0.99
    },
)

claude_chat_llm = ChatBedrock(
    # model_id=config.llm_model_id,
    # transitioning to claude 3 with messages API
    model_id="anthropic.claude-3-haiku-20240307-v1:0",
    client=bedrock_runtime,
    model_kwargs={
        "max_tokens": 1000,
        "temperature": 0.0,
        "top_p": 0.99
    },
)

search = DuckDuckGoSearchRun()
custom_calculator = CustomCalculatorTool()
rag_qa_chain = get_rag_chain(config, claude_llm, bedrock_runtime)
text_to_sql_chain = get_text_to_sql_chain(config, claude_llm)

LLM_AGENT_TOOLS = [
    Tool(
        name="WebSearch",
        func=search.invoke,
        description=(
            "Use this tool to search for information on current events, news, or general knowledge topics. "
            "For example, you can use this tool to find information about recent news events, famous people, or common facts."
        ),
    ),
    Tool(
        name="Calculator",
        func=custom_calculator,
        description=(
            "Use this tool when you need to perform mathematical calculations. "
            "The input to this tool should be a valid mathematical expression, such as '55/3' or '(10 + 20) * 5'."
        ),
    ),
    Tool(
        name="CompanyFinancialSemanticSearch",
        func=lambda query: rag_qa_chain({"question": query}),
        description=(
            "Use this tool to search for information in companies' financial reports and documents. "
            "For example, you can use this tool to find the revenue, net income, or other financial figures for a specific company in a given year. "
            "The input should be a natural language question related to company financials."
        ),
    ),
    Tool(
        name="AnalyticsQA",
        func=lambda question: get_sql_qa_tool(question, text_to_sql_chain),
        description=(
            "Use this tool to perform analytical queries and calculations on financial data."
            " This tool is suitable for questions that require aggregating, filtering, or performing operations on financial data across multiple years or dimensions."
            " For example, you can use this tool to calculate the maximum revenue, average net income, or percentage change in revenue over a period of time, "
            " or to find years or companies that meet certain financial criteria. "
            "The input should be a natural language question related to analyzing or manipulating financial data."
        ),
    )
]