import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface AssistantApiConstructProps {
  cognitoUserPool: cognito.UserPool;
  lambdaFunction: lambda.Function;
}

export class AssistantApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: AssistantApiConstructProps) {
    super(scope, id);

    const { cognitoUserPool, lambdaFunction } = props;

    this.api = new apigateway.RestApi(this, 'AssistantApi', {
      restApiName: 'assistant-api',
      description:
        'An API to invoke an LLM based agent which orchestrates using tools to answer user questions.',
      defaultCorsPreflightOptions: {
        // // Change this to the specific origin of your app in production
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.CognitoUserPoolsAuthorizer.html
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ChatAuthorizer', {
      cognitoUserPools: [cognitoUserPool],
    });


    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: false,
      integrationResponses: [
        {
          statusCode: '200',
          // Enable CORS for the Lambda Integration
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
      ],
    });

    this.api.root.addMethod(
      'POST',
      lambdaIntegration,
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
        ],
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Add an SSM parameter to hold Rest API URL
    new ssm.StringParameter(
      this,
      "AgentAPIURLParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/agent_api",
        stringValue: this.api.url
      }
    );

    // stack output
    new cdk.CfnOutput(this, "EndpointURL", {
      value: this.api.url
    });
  }
}