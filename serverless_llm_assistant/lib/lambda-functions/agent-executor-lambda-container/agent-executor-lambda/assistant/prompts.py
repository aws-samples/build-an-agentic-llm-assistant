from datetime import datetime
from langchain.prompts.prompt import PromptTemplate

# ============================================================================
# Claude basic chatbot prompt construction
# ============================================================================

date_today = str(datetime.today().date())

_CALUDE_PROMPT_TEMPLATE = f"""

Human: The following is a friendly conversation between a human and an AI.
The AI answers politely and accurately and provides specific details from its context when it's relevant.
If the AI does not know the answer to a question, it truthfully says it does not know.

The date today is {date_today}.

Current conversation:
<conversation_history>
{{history}}
</conversation_history>

Here is the human's next reply:
<human_reply>
{{input}}
</human_reply>

Assistant:
"""

CLAUDE_PROMPT = PromptTemplate(
    input_variables=["history", "input"], template=_CALUDE_PROMPT_TEMPLATE
)

## Placeholder for lab 3 - agent prompt code
## replace this placeholder with code from lab 3, step 2 as instructed.
