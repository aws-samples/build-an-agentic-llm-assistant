import json
from pypdf import PdfReader, PdfWriter
import shutil
import os
from textractor import Textractor
from textractor.data.constants import TextractFeatures
import boto3
import logging
from botocore.exceptions import ClientError
import requests
import sys

sys.path.append(os.path.abspath("."))
from utils.helpers import store_list_to_s3

import sagemaker

default_sagemaker_bucket = sagemaker.Session().default_bucket()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def download_pdf_files(base_directory, docs_mapping, headers):
    # Create the base directory if it doesn't exist
    if not os.path.exists(base_directory):
        os.makedirs(base_directory)

    for company, docs in docs_mapping.items():
        company_directory = os.path.join(base_directory, company)

        # Create a directory for the company if it doesn't exist
        if not os.path.exists(company_directory):
            os.makedirs(company_directory)

        for doc_info in docs:
            doc_url = doc_info["doc_url"]
            year = doc_info["year"]

            # Skip empty URLs
            if not doc_url:
                continue

            # Construct the filename based on the year and the URL
            filename = f"annual_report_{year}.pdf"
            file_path = os.path.join(company_directory, filename)

            # Check if the file already exists
            if os.path.exists(file_path):
                print(f"{filename} already exists for {company}")
            else:
                # Download the document
                response = requests.get(doc_url, headers=headers)

                if response.status_code == 200:
                    with open(file_path, "wb") as file:
                        file.write(response.content)
                    print(f"Downloaded {filename} for {company}")
                else:
                    print(
                        f"Failed to download {filename} for {company}"
                        f" (Status Code: {response.status_code})"
                    )

def keep_relevant_pages_in_pdf(input_pdf_path, output_pdf_path, pages):
    input_pdf = PdfReader(input_pdf_path)
    print(f"Number of pages is {len(input_pdf.pages)}")
    print(f"Relevant pages are {pages}")
    output_pdf = PdfWriter()

    for page_num in pages:
        output_pdf.add_page(input_pdf.pages[page_num - 1])

    with open(output_pdf_path, "wb") as f:
        output_pdf.write(f)


def save_json(json_data, file_path):
    with open(file_path, "w") as f:
        json.dump(json_data, f)

def keep_relevant_pages_in_pdfs(
    raw_base_directory, prepared_base_directory, docs_mapping
):
    metadata = []
    # Create the base directory if it doesn't exist
    if not os.path.exists(prepared_base_directory):
        os.makedirs(prepared_base_directory)

    for company, docs in docs_mapping.items():
        raw_company_directory = os.path.join(raw_base_directory, company)
        prepared_company_directory = os.path.join(prepared_base_directory, company)

        # Create a directory for the company if it doesn't exist
        if not os.path.exists(prepared_company_directory):
            os.makedirs(prepared_company_directory)

        for doc_info in docs:
            doc_url = doc_info["doc_url"]
            year = doc_info["year"]
            pages = doc_info.get("pages", [])
            if not doc_url:
                continue

            current_metadata = {}
            current_metadata["company"] = company
            current_metadata["year"] = year
            current_metadata["doc_url"] = doc_url

            # Construct the filename based on the year and the URL
            filename = f"annual_report_{year}.pdf"
            input_pdf_path = os.path.join(raw_company_directory, filename)
            output_pdf_path = os.path.join(prepared_company_directory, filename)

            current_metadata["local_pdf_path"] = output_pdf_path

            if not pages:
                # When page numbers are not defined, we assume the user wants
                # to process the full file, therefore, copy it as is
                # to the prepared folder
                shutil.copyfile(input_pdf_path, output_pdf_path)
                metadata.append(current_metadata)
                continue

            relevant_pages = doc_info["pages"]
            current_metadata["pages_kept"] = relevant_pages

            # Skip empty URLs

            keep_relevant_pages_in_pdf(input_pdf_path, output_pdf_path, relevant_pages)

            metadata.append(current_metadata)

    save_json(metadata, os.path.join(prepared_base_directory, "metadata.json"))

    return True

def extract_documents():
    region = boto3.session.Session().region_name
    # extractor = Textractor(profile_name="default")
    extractor = Textractor(region_name=region)

    input_document = "raw_documents/prepared/Amazon/annual_report_2022.pdf"

    document = extractor.start_document_analysis(
        file_source=input_document,
        s3_upload_path=f"s3://{default_sagemaker_bucket}/input_documents/",
        s3_output_path=f"s3://{default_sagemaker_bucket}/output_documents/",
        features=[TextractFeatures.LAYOUT],
        save_image=False
    )

def generate_message(bedrock_runtime, model_id, system_prompt, messages, max_tokens):

    body=json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages
        }
    )
    response = bedrock_runtime.invoke_model(body=body, modelId=model_id)
    response_body = json.loads(response.get('body').read())

    return response_body


def call_llm(user_input, model_id, system_prompt, bedrock_runtime, max_tokens=1000):
    """Handle calls to Anthropic Claude message api."""
    try:
        # Prompt with user turn only.
        user_message =  {"role": "user", "content": user_input}
        messages = [user_message]
        return generate_message(bedrock_runtime, model_id, system_prompt, messages, max_tokens)
    except ClientError as err:
        message=err.response["Error"]["Message"]
        logger.error("A client error occurred: %s", message)
        print("A client error occured: " +
            format(message))

user_prompt = """
Improve the markdown while keeping all original information. Put the improved markdown inside a <results> xml tags with no explanation:
\n{markdown_doc}
""".strip()

system_prompt = "Your task is to review and improve the results of Amazon textract in markdown."


def improve_textract_markdown_output(document, llm_model_id):
    improved_markdown = []
    for i in range(len(document.pages)):
        user_input = user_prompt.format(markdown_doc=document.pages[i].to_markdown())
        result = call_llm(user_input, llm_model_id, system_prompt, bedrock_runtime, max_tokens=3000)
        # Extract the text between the <results> XML tags only.
        improved_markdown.append(result["content"][0]["text"].split("<results>")[-1].split("</results>")[0].strip())
    return improved_markdown

def extract_pages_as_markdown(input_document):
    extractor = Textractor()
    document = extractor.start_document_analysis(
        file_source=input_document,
        s3_upload_path=f"s3://{default_sagemaker_bucket}/input_documents/",
        s3_output_path=f"s3://{default_sagemaker_bucket}/output_documents/",
        features=[TextractFeatures.LAYOUT],
        save_image=False
    )

    res = improve_textract_markdown_output(document, llm_model_id)
    pages = [{"page": indx, "page_text": text} for indx, text in enumerate(res)]
    return pages


def extract_docs_into_markdown(docs_metadata):
    results = []
    for doc_meta in docs_metadata:
        doc_result_with_metadata = {}
        doc_result_with_metadata["metadata"] = doc_meta
        doc_result_with_metadata["name"] = doc_meta["doc_url"].split("/")[-1]
        doc_result_with_metadata["source_location"] = doc_meta["doc_url"]
        doc_result_with_metadata["pages"] = extract_pages_as_markdown(doc_meta["local_pdf_path"])
        results.append(doc_result_with_metadata)
    return results


docs_mapping = {
    "Amazon": [
        {
            "doc_url": "https://s2.q4cdn.com/299287126/files/doc_financials/2023/ar/Amazon-2022-Annual-Report.pdf",
            "year": "2022",
            "pages": [15, 17, 18, 47, 48],
        },
        {
            "doc_url": "https://s2.q4cdn.com/299287126/files/doc_financials/2022/ar/Amazon-2021-Annual-Report.pdf",
            "year": "2021",
            "pages": [14, 16, 17, 18, 46, 47],
        },
        {"doc_url": "", "year": ""},
    ]
}

bedrock_runtime = boto3.client("bedrock-runtime", region_name="us-west-2")
llm_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"


if __name__ == "__main__":
    raw_base_directory = "raw_documents"
    if not os.path.exists(raw_base_directory):
        os.makedirs(raw_base_directory)
    
    prepared_base_directory = os.path.join(raw_base_directory, "prepared/")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    download_pdf_files(raw_base_directory, docs_mapping, headers)

    keep_relevant_pages_in_pdfs(raw_base_directory, prepared_base_directory, docs_mapping)
    with open(
        os.path.join(prepared_base_directory, "metadata.json"), "r"
    ) as prepared_pdfs_metadata_obj:
        prepared_pdfs_metadata = json.load(prepared_pdfs_metadata_obj)
    results = extract_docs_into_markdown(prepared_pdfs_metadata)
    ssm = boto3.client("ssm")
    s3_bucket_name_parameter = "/AgenticLLMAssistantWorkshop/AgentDataBucketParameter"
    s3_bucket_name = ssm.get_parameter(Name=s3_bucket_name_parameter)
    s3_bucket_name = s3_bucket_name["Parameter"]["Value"]
    processed_documents_s3_key = "documents_processed.json"
    store_list_to_s3(s3_bucket_name, processed_documents_s3_key, results)
    print("Done!")