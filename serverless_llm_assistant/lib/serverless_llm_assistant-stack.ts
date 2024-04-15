import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from "aws-cdk-lib/aws-apigateway";

import { Vpc } from "./vpc-stack";

const AGENT_DB_NAME = "AgentSQLDBandVectorStore";

export class ServerlessLlmAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------------------
    // VPC Construct
    // Create subnets and VPC endpoints
    // const vpc = new Vpc(this, "Vpc");

    // -----------------------------------------------------------------------
    // Create relevant SSM parameters
    const parameters = this.node.tryGetContext("parameters") || {
      "bedrock_region": "us-west-2",
      "llm_model_id": "anthropic.claude-v2"
    };

    const BEDROCK_REGION = parameters["bedrock_region"];
    const LLM_MODEL_ID = parameters["llm_model_id"];

    // Note: the SSM parameters for Bedrock region and endpoint are used
    // to setup a boto3 bedrock client for programmatic access to Bedrock APIs.

    // Add an SSM parameter for the Bedrock region.
    const ssm_bedrock_region_parameter = new ssm.StringParameter(
      this,
      "ssmBedrockRegionParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/bedrock_region",
        // This is the default region.
        // The user can update it in parameter store.
        stringValue: BEDROCK_REGION,
      }
    );

    // Add an SSM parameter for the llm model id.
    const ssm_llm_model_id_parameter = new ssm.StringParameter(
      this,
      "ssmLLMModelIDParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/llm_model_id",
        // This is the default region.
        // The user can update it in parameter store.
        stringValue: LLM_MODEL_ID,
      }
    );

    // Placeholder for Lab 4, step 2.2 - Put the database resource definition here.

    // -----------------------------------------------------------------------
    // Add a DynamoDB table to store chat history per session id.

    // When you see a need for it, consider configuring autoscaling to the table
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html#configure-autoscaling-for-your-table
    const ChatMessageHistoryTable = new dynamodb.Table(
      this,
      "ChatHistoryTable",
      {
        // consider activating the encryption by uncommenting the code below.
        // encryption: dynamodb.TableEncryption.AWS_MANAGED,
        partitionKey: {
          name: "SessionId",
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        // Considerations when choosing a table class
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.tableclasses.html
        tableClass: dynamodb.TableClass.STANDARD,
        // When moving to production, use cdk.RemovalPolicy.RETAIN instead
        // which will keep the database table when destroying the stack.
        // this avoids accidental deletion of user data.
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED
      }
    );

    // -----------------------------------------------------------------------
    // Add AWS Lambda container and function to serve as the agent executor.
    const agent_executor_lambda = new lambda.DockerImageFunction(
      this,
      "LambdaAgentContainer",
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(
            __dirname,
            "lambda-functions/agent-executor-lambda-container"
          ),
          {
            buildArgs: { "--platform": "linux/amd64" }
          }
        ),
        description: "Lambda function with bedrock access created via CDK",
        timeout: cdk.Duration.minutes(5),
        memorySize: 2048,
        environment: {
          BEDROCK_REGION_PARAMETER: ssm_bedrock_region_parameter.parameterName,
          LLM_MODEL_ID_PARAMETER: ssm_llm_model_id_parameter.parameterName,
          CHAT_MESSAGE_HISTORY_TABLE: ChatMessageHistoryTable.tableName
        },
      }
    );

    // Allow Lambda to read SSM parameters.
    ssm_bedrock_region_parameter.grantRead(agent_executor_lambda);
    ssm_llm_model_id_parameter.grantRead(agent_executor_lambda);

    // Allow Lambda read/write access to the chat history DynamoDB table
    // to be able to read and update it as conversations progress.
    ChatMessageHistoryTable.grantReadWriteData(agent_executor_lambda);

    // Allow the Lambda function to use Bedrock
    agent_executor_lambda.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess')
    );

    // Save the Lambda ARN in an SSM parameter to simplify invoking the lambda
    // from a SageMaker notebook, without having to copy it manually.
    const agentLambdaNameParameter = new ssm.StringParameter(
      this,
      "AgentLambdaNameParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/AgentExecutorLambdaNameParameter",
        stringValue: agent_executor_lambda.functionName,
      }
    );

    //------------------------------------------------------------------------
    // Create an S3 bucket for intermediate data staging
    // and allow SageMaker to read and write to it.
    const agent_data_bucket = new s3.Bucket(this, "AgentDataBucket", {
      // Warning, swith DESTROY to RETAIN to avoid accidental deletion
      // of important data.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Save the bucket name as an SSM parameter to simplify using it in
    // SageMaker processing jobs without having to copy the name manually.
    const agentDataBucketParameter = new ssm.StringParameter(
      this,
      "AgentDataBucketParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/AgentDataBucketParameter",
        stringValue: agent_data_bucket.bucketName,
      }
    );

    // -----------------------------------------------------------------------
    // Create a managed IAM policy to be attached to a SageMaker execution role
    // to allow the required permissions to retrieve the information to access the database.
    const SageMakerPostgresDBAccessIAMPolicy = new iam.ManagedPolicy(
      this,
      "sageMakerPostgresDBAccessIAMPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            actions: ["ssm:GetParameter"],
            resources: [
              ssm_bedrock_region_parameter.parameterArn,
              ssm_llm_model_id_parameter.parameterArn,
              agentLambdaNameParameter.parameterArn,
              agentDataBucketParameter.parameterArn,
            ],
          }),
          new iam.PolicyStatement({
            // add permission to read and write to the data bucket
            actions: [
              "s3:GetObject",
              "s3:PutObject",
              "s3:DeleteObject",
              "s3:ListBucket",
            ],
            resources: [
              // Add permission to get only the data bucket
              agent_data_bucket.bucketArn,
              agent_data_bucket.arnForObjects("*"),
            ],
          }),
          new iam.PolicyStatement({
            // add permission to invoke the agent executor lambda function.
            actions: ["lambda:InvokeFunction"],
            resources: [
              agent_executor_lambda.functionArn,
            ]
          }),
        ],
      }
    );

    // -----------------------------------------------------------------------
    // Create a new Cognito user pool
    // documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPool.html
    const cognito_user_pool = new cognito.UserPool(this, "CognitoPool", {
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
        username: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false
        }
      }
    });

    // Add an app client to the user pool
    const pool_client = cognito_user_pool.addClient(
      "NextJsAppClient",
      {
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [cognito.OAuthScope.OPENID],
          callbackUrls: ["https://localhost:3000/"],
          logoutUrls: ["https://localhost:3000/"],
        },
      },
    );

    // -------------------------------------------------------------------------
    // Add an Amazon API Gateway with AWS cognito auth and an AWS lambda as a backend

    const agent_api = new apigateway.RestApi(this, "AssistantApi", {
      restApiName: "assistant-api",
      description:
        "An API to invoke an LLM based agent which orchestrates using tools to answer user input questions.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Change this to the specific origin of your app in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.CognitoUserPoolsAuthorizer.html
    const cognito_authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ChatAuthorizer', {
      cognitoUserPools: [cognito_user_pool]
    });

    const agent_lambda_integration = new apigateway.LambdaIntegration(agent_executor_lambda, {
      proxy: false, // Set this to false to integrate with Lambda function directly
      integrationResponses: [{
        statusCode: '200',
        // Enable CORS for the Lambda Integration
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
        },
      }]
    });

    agent_api.root.addMethod(
      "POST",
      agent_lambda_integration,
      {
        // Enable CORS for the API
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        }],
        authorizer: cognito_authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO
      }
    );

    // -----------------------------------------------------------------------
    // Add an SSM parameter to hold the cognito user pool id
    const cognito_user_pool_id_parameter = new ssm.StringParameter(
      this,
      "cognitoUserPoolParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/cognito_user_pool_id",
        stringValue: cognito_user_pool.userPoolId,
      }
    );

    // Add an SSM parameter to hold the cognito user pool id
    const cognito_user_pool_client_id_parameter = new ssm.StringParameter(
      this,
      "cognitoUserPoolClientParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/cognito_user_pool_client_id",
        stringValue: pool_client.userPoolClientId,
      }
    );

    // Add an SSM parameter to hold Rest API URL
    const agent_api_parameter = new ssm.StringParameter(
      this,
      "AgentAPIURLParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/agent_api",
        stringValue: agent_api.url
      }
    );

    // -----------------------------------------------------------------------
    // stack outputs

    new cdk.CfnOutput(this, "sageMakerPostgresDBAccessIAMPolicyARN", {
      value: SageMakerPostgresDBAccessIAMPolicy.managedPolicyArn,
    });

    // Output the clientID
    new cdk.CfnOutput(this, "UserPoolClient", {
      value: pool_client.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: cognito_user_pool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolProviderURL", {
      value: cognito_user_pool.userPoolProviderUrl
    });

    new cdk.CfnOutput(this, "EndpointURL", {
      value: agent_api.url
    });

  }
}
