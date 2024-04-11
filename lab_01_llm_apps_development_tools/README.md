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
* Task 2: Create an S3 bucket using AWS CloudFormation
    * use the cloudformation in `lab1.1_cloudformation_s3.yaml`.
    * Follow the instructor's demo.
* Task 3: Create an S3 bucket using CDK
    * use the cdk stack within the folder `lab1.2_s3_cdk`
    * Follow the instructor's demo.
    * Make sure to destroy the stack after the exercise is finished using `cdk destroy`
* Task 4: call to action - reflect on the benefit of using Infrastructure as Code.
