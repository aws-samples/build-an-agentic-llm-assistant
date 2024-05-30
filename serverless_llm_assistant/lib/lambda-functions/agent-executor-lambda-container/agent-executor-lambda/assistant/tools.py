# This module will be edited in Lab 03 to add the agent tools.
import boto3
from langchain.agents import Tool
from langchain_aws import BedrockLLM
from langchain_aws import ChatBedrock

from langchain_community.tools import DuckDuckGoSearchRun
from .calculator import CustomCalculatorTool
from .config import AgenticAssistantConfig

config = AgenticAssistantConfig()
bedrock_runtime = boto3.client("bedrock-runtime", region_name=config.bedrock_region)

claude_llm = BedrockLLM(
    model_id=config.llm_model_id,
    client=bedrock_runtime,
    model_kwargs={
        "max_tokens": 1000,
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
