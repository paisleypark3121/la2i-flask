import os
from dotenv import load_dotenv
#import pdfkit

def read_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        html_content = file.read()
    return html_content

def html_to_pdf(html_content, output_pdf):
    pdfkit.from_string(html_content, output_pdf)

load_dotenv()

# file_path="files/chat_history.pdf_1.html"
# html_content=read_html_file(file_path)
# html_to_pdf(html_content,"files/test.pdf")