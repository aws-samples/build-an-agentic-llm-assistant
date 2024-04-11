# This module will be edited in Lab 03 to add the agent tools.
import boto3
from langchain.agents import Tool
from langchain.llms.bedrock import Bedrock
from langchain_community.tools import DuckDuckGoSearchRun
from .calculator import CustomCalculatorTool
from .config import AgenticAssistantConfig

config = AgenticAssistantConfig()
bedrock_runtime = boto3.client("bedrock-runtime", region_name=config.bedrock_region)

claude_llm = Bedrock(
    model_id=config.llm_model_id,
    client=bedrock_runtime,
    model_kwargs={"max_tokens_to_sample": 500, "temperature": 0.0},
)
