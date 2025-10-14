import logging
import traceback
import boto3

from strands import Agent
from strands.models import BedrockModel

from assistant.config import AgenticAssistantConfig
from assistant.memory import StrandsDynamoDBMemory
from assistant.prompts import BASIC_SYSTEM_PROMPT, AGENTIC_SYSTEM_PROMPT
from assistant.tools import get_strands_tools
from assistant.utils import parse_markdown_content
## Lab 3, step 4.2: Import Strands tools here when implementing agentic mode

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ssm = boto3.client("ssm")
config = AgenticAssistantConfig()

def get_bedrock_model():
    """Initialize Bedrock model for Strands."""
    return BedrockModel(
        model_id=config.llm_model_id,
        region_name=config.bedrock_region,
        model_kwargs={
            "max_tokens": 1000,
            "temperature": 0.0,
            "top_p": 0.99
        }
    )

def get_basic_chatbot_agent(session_id, clean_history):
    """Create basic chatbot using Strands Agent."""
    model = get_bedrock_model()
    
    # Initialize memory
    memory = StrandsDynamoDBMemory(
        table_name=config.chat_message_history_table_name,
        session_id=session_id,
        clean_history=clean_history
    )
    
    agent = Agent(
        model=model,
        callback_handler=None,  # Disable console output for Lambda
        system_prompt=BASIC_SYSTEM_PROMPT
    )
    
    return agent, memory

## Lab 3, step 4.3: Replace this placeholder with the get_agentic_chatbot_agent helper.
def get_agentic_chatbot_agent(session_id, clean_history):
    """Create agentic chatbot with tools using Strands Agent."""
    model = get_bedrock_model()
    
    # Initialize memory
    memory = StrandsDynamoDBMemory(
        table_name=config.chat_message_history_table_name,
        session_id=session_id,
        clean_history=clean_history
    )
    
    # Get all tools
    tools = get_strands_tools()
    
    agent = Agent(
        model=model,
        tools=tools,
        callback_handler=None,
        system_prompt=AGENTIC_SYSTEM_PROMPT
    )
    
    return agent, memory

def lambda_handler(event, context):
    logger.info(event)
    
    user_input = event["user_input"]
    session_id = event["session_id"]
    chatbot_type = event.get("chatbot_type", "basic")
    clean_history = event.get("clean_history", False)
    
    try:
        if chatbot_type == "basic":
            agent, memory = get_basic_chatbot_agent(session_id, clean_history)
            
        elif chatbot_type == "agentic":
            agent, memory = get_agentic_chatbot_agent(session_id, clean_history)
            
        else:
            return {
                "statusCode": 400,
                "response": f"Unsupported chatbot_type: {chatbot_type}. Use 'basic' or 'agentic'."
            }
        
        # Add conversation history to context
        history = memory.get_conversation_history()
        if history:
            full_input = f"Previous conversation:\n{history}\n\nHuman: {user_input}\n\nAssistant:"
        else:
            full_input = f"Human: {user_input}\n\nAssistant:"
            
        # Get response from agent - Strands handles the entire agent loop automatically
        result = agent(full_input)
        response = str(result.message)
        
        # Parse markdown content (preserve existing utility)
        response = parse_markdown_content(response)
        
        # Save conversation to memory
        memory.save_conversation(user_input, response)
        
        return {
            "statusCode": 200,
            "response": response,
            "metrics": result.metrics.get_summary() if hasattr(result, 'metrics') else {}
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "statusCode": 500,
            "response": "Unable to respond due to an internal issue. Please try again later."
        }
