from datetime import datetime
from langchain.prompts.prompt import PromptTemplate

# ============================================================================
# Claude basic chatbot prompt construction
# ============================================================================

date_today = str(datetime.today().date())
_CALUDE_PROMPT_TEMPLATE = f"""
\nHuman: The following is a friendly conversation between a human and an AI assistant.
The assistant is polite, helpful, and accurately replies to input messages or questions.

The previous conversation is available within the <conversation_history> XML tags below.
In the history Hu refers to the human and AI refers to the assistant.
You can refer to this history to answer questions but do not share it with the user.

<conversation_history>
{{history}}
</conversation_history>

The date today is {date_today}.

The current user input is the following: {{input}}

Assistant:"""

CLAUDE_PROMPT = PromptTemplate(
    input_variables=["history", "input"], template=_CALUDE_PROMPT_TEMPLATE
)
