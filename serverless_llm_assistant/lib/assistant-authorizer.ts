import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface CognitoConstructProps {
  userPoolName?: string;
  clientName?: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: CognitoConstructProps) {
    super(scope, id);

    // Create a new Cognito user pool
    // documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPool.html
    this.userPool = new cognito.UserPool(this, 'CognitoPool', {
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
        username: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
    });
    
    // Add an app client to the user pool
    this.userPoolClient = this.userPool.addClient('NextJsAppClient', {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: ['https://localhost:3000/'],
        logoutUrls: ['https://localhost:3000/'],
      },
    });

    // Add an SSM parameter to hold the cognito user pool id
    new ssm.StringParameter(
      this,
      "cognitoUserPoolParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/cognito_user_pool_id",
        stringValue: this.userPool.userPoolId,
      }
    );

    // Add an SSM parameter to hold the cognito user pool id
    new ssm.StringParameter(
      this,
      "cognitoUserPoolClientParameter",
      {
        parameterName: "/AgenticLLMAssistantWorkshop/cognito_user_pool_client_id",
        stringValue: this.userPoolClient.userPoolClientId,
      }
    );

    // Stack outputs
    new cdk.CfnOutput(this, "UserPoolClient", {
      value: this.userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolProviderURL", {
      value: this.userPool.userPoolProviderUrl
    });

  }
}