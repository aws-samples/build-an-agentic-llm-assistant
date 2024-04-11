## Goal

Extend the agent further with the ability to answer analytical queries. This will leverage the Text-to-SQL design pattern.

## Concepts

* Using LLM for generating Text-to-SQL
* Guidelines for LLM prompts to generate good Text-to-SQL.

## Lab

In this lab, we will further extend the agent with the ability to answer analytical questions, such as `what is the most profitable region?`.
To achieve this, you will work on adding the ability to translate user questions into SQL queries, validating and running these queries against a SQL database,
and finally integrating the results with the agent to answer analytical questions.

Throughout this lab, you will focus on the resources highlighted in red below, namely updating the LLM agent in AWS Lambda function and ingesting a SQL table into the database.

![Agentic Assistant workshop Architecture](/assets/agentic-assistant-workshop-architecture-lab-05.png)

#### Step 1: Load a SQL table to the PostgreSQL DB

Run the notebook `data_pipelines/03-load-sql-tables-into-aurora-postgreSQL.ipynb` which will be used to generate a synthetic SQL table (todo) and load it into the Aurora PostgreSQL DB.

#### Step 2: Extend the agent with a tool for analytical question answering with SQL

Adding the ability to answer analytical queries entails:

1. Converting user questions accurately into SQL queries.
2. Validating and executing the user queries against the DB.
3. Augmenting the LLM with the results of the SQL query so it is able to formulate an answer to the question.

Your task is to implement this by following the instructions below.

1. Study the `sqlqa.py` file, namely the `get_sql_qa_tool` function which connects everything together, and the LLM prompt template defined in `_SQL_TEMPLATE`.
2. Reflect, and discuss if possible, the different inputs used within this prompt to generate the SQL query, and potential risks and mitigations.
3. Add the relevant imports below, and create an instance of the `get_text_to_sql_chain`.

```python
from .sqlqa import get_sql_qa_tool, get_text_to_sql_chain

...
TEXT_TO_SQL_CHAIN = get_text_to_sql_chain(config, claude_llm)
```

4. Then add the tool definition to the list of tools. Feel free to tweak the description to help the LLM pick this tool and improve it.

```python
Tool(
    name="SQLQA",
    func=lambda question: get_sql_qa_tool(question, TEXT_TO_SQL_CHAIN),
    description=(
        "Use when you are asked analytical questions about financial reports of companies."
        " For example, when asked to give the average or maximum revenue of a company, etc."
        " The input should be a targeted question."
    ),
),
```

Now redeploy the stack with `npx cdk deploy`

#### Step 3: Load structured metadata into SQL tables

Run the notebook `data_pipelines/05-load-sql-tables-into-aurora-postgreSQL.ipynb` to load the structured metadata extracted from the PDF documents into SQL tables in the PostgreSQL database. This will enable the agent to answer analytical questions based on the structured data.

#### Step 4: Interact with the Assistant and test the SQLQA tool

Now, you can interact with the Assistant by asking analytical questions related to the financial reports and structured data you've loaded into the database. The Assistant should be able to leverage the SQLQA tool to translate your questions into SQL queries, execute them against the database, and incorporate the results into its responses.

Here are some examples of analytical questions you could ask:

* What was the region with the highest revenue for Amazon in 2022?
* How has Amazon's research and development spending changed over the past 5 years?
* Which product category has the highest profit margin for Amazon?
* What is the average customer acquisition cost for Amazon Prime subscribers?
* How does Amazon's revenue growth compare to its competitors in the e-commerce industry?

When asking these questions, observe how the Assistant utilizes the SQLQA tool and incorporates the results from the database into its responses. If the Assistant struggles to understand or answer the analytical questions correctly, you may need to refine the prompts or provide additional guidance to improve the Text-to-SQL capability.