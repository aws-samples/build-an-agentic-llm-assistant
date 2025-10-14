import boto3
from strands import tool
from typing import List, Dict, Any
import json
import math
from duckduckgo_search import DDGS

from .config import AgenticAssistantConfig

config = AgenticAssistantConfig()

@tool
def calculator(expression: str) -> str:
    """
    Perform mathematical calculations safely.
    
    Use this tool when you need to evaluate mathematical expressions,
    perform arithmetic operations, or solve numerical problems.
    
    Args:
        expression: Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")
    
    Returns:
        The calculated result as a string
    """
    try:
        # Define allowed operations for safety
        safe_dict = {
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "log": math.log,
            "exp": math.exp,
            "pi": math.pi,
            "e": math.e,
            "abs": abs,
            "round": round,
            "max": max,
            "min": min,
            "sum": sum
        }
        
        # Use eval with restricted globals for safety
        result = eval(expression, {"__builtins__": {}}, safe_dict)
        return str(result)
        
    except Exception as e:
        return f"Error calculating '{expression}': {str(e)}"

@tool
def web_search(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Search the web for current information and facts.
    
    Use this tool when you need to find current information, recent news,
    or facts that are not in your training data.
    
    Args:
        query: The search query string
        max_results: Maximum number of search results to return (default: 5)
    
    Returns:
        List of search results with title, snippet, and URL
    """
    try:
        with DDGS() as ddgs:
            results = []
            for result in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": result.get("title", ""),
                    "snippet": result.get("body", ""),
                    "url": result.get("href", "")
                })
            return results
    except Exception as e:
        return [{"error": f"Search failed: {str(e)}"}]

@tool
def task_prioritizer(tasks: str, criteria: str = "urgency and importance") -> str:
    """
    Help prioritize a list of tasks based on given criteria.
    
    Use this tool when users need help organizing or prioritizing their tasks,
    projects, or activities.
    
    Args:
        tasks: List of tasks to prioritize (can be comma-separated or numbered)
        criteria: Criteria for prioritization (default: "urgency and importance")
    
    Returns:
        Prioritized list with explanations
    """
    # Use Bedrock to analyze and prioritize tasks
    bedrock = boto3.client('bedrock-runtime', region_name=config.bedrock_region)
    
    prompt = f"""
    Please analyze and prioritize the following tasks based on {criteria}:
    
    Tasks: {tasks}
    
    Provide a prioritized list with brief explanations for the ranking:
    """
    
    try:
        response = bedrock.invoke_model(
            modelId=config.llm_model_id,
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 1000
            })
        )
        
        result = json.loads(response['body'].read())
        return result['content'][0]['text']
        
    except Exception as e:
        return f"Error prioritizing tasks: {str(e)}"

def get_strands_tools() -> List:
    """Get all available Strands tools for the agent."""
    return [calculator, web_search, task_prioritizer]

# Placeholder for Lab 4 - RAG tools will be added here
# TODO: Add semantic search and document QA tools in Lab 4

# Placeholder for Lab 5 - SQL analytics tools will be added here  
# TODO: Add SQL query and analysis tools in Lab 5
