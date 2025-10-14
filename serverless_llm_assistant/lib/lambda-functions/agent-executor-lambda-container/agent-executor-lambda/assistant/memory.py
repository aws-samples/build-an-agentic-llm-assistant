import boto3
from typing import List, Dict

class StrandsDynamoDBMemory:
    """Custom memory implementation for Strands using DynamoDB."""
    
    def __init__(self, table_name: str, session_id: str, clean_history: bool = False):
        self.table_name = table_name
        self.session_id = session_id
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        
        if clean_history:
            self.clear_history()
    
    def get_conversation_history(self) -> str:
        """Get conversation history as formatted string."""
        try:
            response = self.table.get_item(Key={'SessionId': self.session_id})
            
            if 'Item' not in response:
                return ""
            
            history = response['Item'].get('History', [])
            formatted_history = []
            
            for entry in history[-10:]:  # Keep last 10 exchanges
                if entry.get('type') == 'human':
                    formatted_history.append(f"Human: {entry.get('data', {}).get('content', '')}")
                elif entry.get('type') == 'ai':
                    formatted_history.append(f"Assistant: {entry.get('data', {}).get('content', '')}")
            
            return "\n".join(formatted_history)
            
        except Exception as e:
            print(f"Error retrieving conversation history: {e}")
            return ""
    
    def save_conversation(self, user_input: str, assistant_response: str):
        """Save conversation turn to DynamoDB."""
        try:
            # Get existing history
            response = self.table.get_item(Key={'SessionId': self.session_id})
            history = response.get('Item', {}).get('History', [])
            
            # Add new entries
            history.extend([
                {
                    'type': 'human',
                    'data': {'content': user_input}
                },
                {
                    'type': 'ai', 
                    'data': {'content': assistant_response}
                }
            ])
            
            # Keep only last 20 entries (10 exchanges)
            if len(history) > 20:
                history = history[-20:]
            
            # Save back to DynamoDB
            self.table.put_item(
                Item={
                    'SessionId': self.session_id,
                    'History': history
                }
            )
            
        except Exception as e:
            print(f"Error saving conversation: {e}")
    
    def clear_history(self):
        """Clear conversation history."""
        try:
            self.table.delete_item(Key={'SessionId': self.session_id})
        except Exception as e:
            print(f"Error clearing history: {e}")
