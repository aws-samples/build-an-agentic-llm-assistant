## Build an Agentic LLM assistant on AWS

This hands-on workshop, aimed at developers and solution builders, trains you on how to build a real-life serverless LLM application using foundation models (FMs) through Amazon Bedrock and advanced design patterns such as: Reason and Act (ReAct) Agent, text-to-SQL, and Retrieval Augemented Generation (RAG).
It complements the [Amazon Bedrock Workshop](https://github.com/aws-samples/amazon-bedrock-workshop) by helping you transition from practicing standalone design patterns in notebooks to building an end-to-end llm serverless application.

Within the labs of this workshop, you'll explore some of the most common and advanced LLM applications design patterns used by customers to improve business operations with Generative AI.
Namely, these labs together help you build step by step a complex Agentic LLM assistant capable of answering retrieval and analytical questions on your internal knowledge bases.

* Lab 1: Explore IaC with AWS CDK to streamline building LLM applications on AWS
* Lab 2: Build a basic serverless LLM assistant with AWS Lambda and Amazon Bedrock
* Lab 3: Refactor the LLM assistant in AWS Lambda into a custom LLM agent with basic tools
* Lab 4: Extend the LLM agent with semantic retrieval from internal knowledge bases
* Lab 5: Extend the LLM agent with the ability to query a SQL database

Throughout these labs, you will be using and extending the CDK stack of the **Serverless LLM Assistant** available under the folder `serverless_llm_assistant`.

## Prerequisites

1. [Create an AWS Cloud9 environment](https://docs.aws.amazon.com/cloud9/latest/user-guide/tutorial-create-environment.html) to use as an IDE.
2. Configure [model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html) on Amazon Bedrock console, namely to access Amazon Titan and Anthropic Claude models on `us-west-2 (Oregon)`.
3. Setup an Amazon SageMaker Studio environment, using the [Quick setup for single users](https://docs.aws.amazon.com/sagemaker/latest/dg/onboard-quick-start.html#onboard-quick-start-instructions), to run the data-pipelines notebooks.

Once ready, clone this repository into the new Cloud9 environment and follow lab instructions.

## Architecture

The following diagram illustrates the target architecture of this workshop:

![Agentic Assistant workshop Architecture](/assets/agentic-assistant-workshop-architecture.png)

## Next step

You can build on the knowledge acquired in this workshop by solving a more complex problem that requires studying the limitation of the popular design patterns used in llm application development and desiging a solution to overcome these limitations.
For this, we propose that you read through the blog post [Boosting RAG-based intelligent document assistants using entity extraction, SQL querying, and agents with Amazon Bedrock
](https://aws.amazon.com/blogs/machine-learning/boosting-rag-based-intelligent-document-assistants-using-entity-extraction-sql-querying-and-agents-with-amazon-bedrock/) and explore its associated GitHub repository [aws-agentic-document-assistant](https://github.com/aws-samples/aws-agentic-document-assistant/).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
