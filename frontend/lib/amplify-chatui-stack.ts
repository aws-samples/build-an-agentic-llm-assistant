import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';


export class AmplifyChatuiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -------------------------------------------------------------------------
    // Load SSM parameter that stores the Lambda function name

    const cognito_user_pool_id_parameter = ssm.StringParameter.valueForStringParameter(
      this, "/AgenticLLMAssistantWorkshop/cognito_user_pool_id"
    );

    const cognito_user_pool_client_id_parameter = ssm.StringParameter.valueForStringParameter(
      this, "/AgenticLLMAssistantWorkshop/cognito_user_pool_client_id"
    );

    // SSM parameter holding Rest API URL
    const agent_api_parameter = ssm.StringParameter.valueForStringParameter(
      this, "/AgenticLLMAssistantWorkshop/agent_api"
    );

    // -------------------------------------------------------------------------
    // Setup IAM permissions for Amplify CI/CD
    const amplify_role = new iam.Role(this, 'AmplifyRole', {
        assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
        description: 'CDK Amplify Role',
    });

    // Adding the same permissions added by the process documented in the link
    // https://docs.aws.amazon.com/amplify/latest/userguide/how-to-service-role-amplify-console.html
    amplify_role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'));

    // -------------------------------------------------------------------------
    const AmplifyChatUIGitHubSourceCodeProvider = new amplify.GitHubSourceCodeProvider({
      owner: "aws-samples",
      repository: "build-an-agentic-llm-assistant",
      oauthToken: cdk.SecretValue.secretsManager("github-access-token-for-amplify-cicd")
    });

    // from https://docs.aws.amazon.com/cdk/api/v2/docs/aws-amplify-alpha-readme.html
    const amplifyChatUI = new amplify.App(this, 'AmplifyNextJsChatUI', {
      autoBranchDeletion: true,
      sourceCodeProvider: AmplifyChatUIGitHubSourceCodeProvider,
      // enable server side rendering
      platform: amplify.Platform.WEB_COMPUTE,
      role: amplify_role,
      // https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html#amplify-console-environment-variables
      environmentVariables: {
        'AMPLIFY_USERPOOL_ID': cognito_user_pool_id_parameter,
        'COGNITO_USERPOOL_CLIENT_ID': cognito_user_pool_client_id_parameter,
        'API_ENDPOINT': agent_api_parameter,
        'AMPLIFY_DIFF_DEPLOY': 'false',
        'AMPLIFY_MONOREPO_APP_ROOT': 'frontend/chat-app',
        'NEXT_PUBLIC_AWS_AMPLIFY_REGION': this.region,
      }
    });

    new cdk.CfnResource(this, 'AmplifyBranch', {
      type: 'AWS::Amplify::Branch',
      properties: {
        AppId: amplifyChatUI.appId,
        BranchName: 'main',
        Stage: 'PRODUCTION',
        Framework: 'Next.js - SSR'
      }
    })

    // -----------------------------------------------------------------------
    // Stack outputs

    new cdk.CfnOutput(this, "AmplifyAppURL", {
      value: amplifyChatUI.defaultDomain,
    });

    new cdk.CfnOutput(this, "AppId", {
      value: amplifyChatUI.appId
    });

  }
}