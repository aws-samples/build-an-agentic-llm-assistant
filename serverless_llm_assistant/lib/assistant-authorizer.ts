import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
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
  }
}