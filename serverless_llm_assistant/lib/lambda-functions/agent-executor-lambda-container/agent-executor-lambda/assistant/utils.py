from bs4 import BeautifulSoup


def parse_markdown_content(text):
    """
    Parses the content between <markdown> and </markdown> tags from the given text.
    
    Args:
        text (str): The input text containing the markdown tag content.
        
    Returns:
        str: The content between the markdown tags, or an empty string if not found.
    """
    soup = BeautifulSoup(text, 'html.parser')
    markdown_tag = soup.find('markdown')
    
    if markdown_tag:
        return markdown_tag.get_text()
    else:
        return ''