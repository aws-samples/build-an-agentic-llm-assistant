
## Goal

Build a serverless LLM assistant with AWS Lambda and Bedrock using AWS CDK (20min)

## Concepts

In this second lab, you will focus on deploying and interacting with a serverless LLM (Large Language Model) assistant architecture.
First, you will study the architecture diagram, explore the resources described in the CDK stack,
and deploy the serverless LLM assistant infrastructure using CDK commands,
demonstrating the power of Infrastructure as Code (IaC) automation and providing hands-on experience in deploying cloud resources programmatically.
Second, you have the option to deploy a frontend for the LLM assistant using AWS Amplify,
showcasing the integration of a user-friendly web interface with the serverless LLM assistant,
enabling seamless interaction through a graphical user interface (GUI).
Finally, you can interact with the LLM assistant either through the deployed frontend (if installed) or by directly calling the Lambda function,
the former approach providing a user-friendly web interface, while the latter demonstrates interacting with serverless applications programmatically using AWS console or boto3, a Python SDK for AWS.
Throughout the lab, you will gain practical experience in deploying serverless architectures, leveraging IaC automation tools like CDK,
and exploring different methods of interacting with serverless LLM assistants, reinforcing the concepts of serverless computing, IaC automation, and secure access management learned in the previous lab.

## Lab

Follow the instructions below to complete the lab.

#### Step 1: Understand and deploy the serverless LLM assistant architecture

1. Study the architecture diagram for the *serverless llm assistant* below.
    * Notice the architecture modules installed at this stage are highlighted in red.
2. Explore the resources described in the CDK stack and reflect on how they map to the architecture diagram.
3. Navigate to the `serverless_llm_assistant` directory.
4. Install the required dependencies by running `npm install`.
5. Deploy the CDK stack by running `npx cdk deploy`.
6. Observe and explore the installed resources through the AWS CloudFormation console.

![Agentic Assistant workshop Architecture](/assets/agentic-assistant-workshop-architecture-lab-02.png)

#### Step 2: Deploy the frontend for the LLM assistant

Installing the frontend is optional, you can interact with assistant through it, or alternatively by directly calling the lambda function through boto3
as suggested in step 3 below. If you want to install the frontend, continue with the steps below otherwise skip to step 3.

1. Navigate to the `frontend` directory.
2. Install the required dependencies by running `npm install`.
4. Deploy the frontend CI/CD to AWS Amplify by running `npx cdk deploy`.
5. Go to AWS Amplify [console](https://console.aws.amazon.com/amplify/home) and trigger a build for the app `AmplifyChatUI`.
![trigger the app build on the Amplify console](/assets/trigger-a-build-of-amplify-app.png)
6. Access the deployed frontend using the hosting URL.

#### Step 3: Interact with the LLM assistant

Now, you can interact with the assistant through a Web UI as follows:

1. Access the deployed frontend and authenticate using Cognito.
2. Interact with the LLM assistant through the UI, using the `basic` assistant mode.

![a demonstration of the chat ui](/assets/assistant-ui-demo.png)

Or by calling the Lambda function directly:

1. First install boto3 by running `pip install boto3` in Cloud9 terminal.
3. Then, using boto3 with the python script `invoke_assistant_lambda.py` you can call the lambda as follows: `python3 invoke_assistant_lambda.py`. You can edit the `user_input` in the script to ask a different question.
4. Alternatively, you can interact the Lambda function through the [AWS Lambda console](https://console.aws.amazon.com/lambda/home) by passing the following as input.
```json
{
    "session_id": 10,
    "user_input": "Could you explain the transformer model?",
    "clean_history": true
}
```

At this stage the LLM could only answer questions based on its training data.
For instance, it can assist you in understanding concepts such as the transformer model with the question `Could you explain the transformer model?`
