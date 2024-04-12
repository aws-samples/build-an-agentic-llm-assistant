## Goal

Understand the value of the tools used to build applications on the cloud,
namely the idea of infrastructure as a code (IaC) using AWS CloudFormation
and AWS CDK.

## Concepts

When developing applications powered by Large Language Models (LLMs),
it's crucial to understand that the process is fundamentally an application development exercise,
much like traditional software development.
While Jupyter Notebooks provide a convenient environment for prototyping and experimentation,
they have limitations when it comes to production deployment and scalability.
This is where traditional application tools such as Infrastructure as Code (IaC) becomes indispensable.

IaC enables developers to treat infrastructure provisioning and configuration as code, allowing for consistent, repeatable,
and automated deployment of resources across different environments.
By embracing IaC, LLM application developers can leverage the same best practices and methodologies that have proven successful in traditional application development,
such as version control, continuous integration/continuous deployment (CI/CD), and infrastructure testing.

Translating LLM applications from Notebooks to IaC-based deployments on AWS Cloud not only ensures scalability and reliability but also promotes collaboration, maintainability, and governance.
Traditional software development practices, including modular design, code reviews, and testing, remain equally relevant in the context of LLM application development, ensuring that the applications are robust, secure, and capable of handling real-world workloads.

By adopting IaC and embracing traditional application development practices,
LLM application developers can streamline the transition from experimentation to production,
enabling them to build and deploy LLM-powered applications at scale while adhering to industry-standard best practices.

## Lab

* Task 1: Create an S3 bucket manully through the AWS console.
    * Follow the instructor instruction, or the documentation at [Step 1: Create your first S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html)
* Task 2: Create an S3 bucket using AWS CloudFormation through the console
    * Use the cloudformation in `lab1.1_cloudformation_s3.yaml`.
    * Follow the instructor's demo, or the documentation on [Creating a stack on the AWS CloudFormation console](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html)
    * Make sure to delete the stack through the console after you finish this exercise.
* Task 3: Create an S3 bucket using AWS CDK
    * Use the CDK stack within the folder `lab1.2_s3_cdk` and follow the insturctions below:
        1. Go into the stack's folder `cd lab1.2_s3_cdk`.
        2. Run `npm clean-install` to install the stack's dependencies.
        3. Run `npx cdk bootstrap` to setup CDK on your account. This only needs to happen once per AWS account and region combination.
        4. Then install the stack using `npx cdk deploy`
    * One the Stack deployment is finished, check the newly created bucket on Amazon S3.
    * Make sure to destroy the stack after the exercise is finished using `npx cdk destroy`
* Task 4: call to action - reflect on the benefit of using Infrastructure as Code.
