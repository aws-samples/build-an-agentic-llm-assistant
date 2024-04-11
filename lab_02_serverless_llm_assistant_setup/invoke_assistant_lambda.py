import json
import boto3

# Initialize Boto3 clients for Lambda and SSM
lambda_client = boto3.client("lambda")
ssm_client = boto3.client("ssm")


lambda_function_name_ssm_parameter = (
    "/AgenticLLMAssistantWorkshop/AgentExecutorLambdaNameParameter"
)

lambda_function_name = ssm_client.get_parameter(Name=lambda_function_name_ssm_parameter)
lambda_function_name = lambda_function_name["Parameter"]["Value"]


def call_agent_lambda(user_input, session_id):
    payload = {
        "user_input": user_input,
        "session_id": session_id,
        "clean_history": True
    }

    try:
        # Call the Lambda function
        lambda_response = lambda_client.invoke(
            FunctionName=lambda_function_name,
            InvocationType="RequestResponse",  # Use 'Event' for asynchronous invocation
            Payload=json.dumps(payload),
        )

        # Parse the Lambda function response
        lambda_result = lambda_response["Payload"].read().decode("utf-8")
        lambda_result = json.loads(lambda_result)

        return lambda_result
    except Exception as e:
        print(e)


session_id = "10"
user_input = "Could you explain the transformer model?"

results = call_agent_lambda(user_input, session_id)

print(results["response"].strip())
