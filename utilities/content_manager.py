import os
from langchain.embeddings import OpenAIEmbeddings
from utilities.chromadb_manager import *
from utilities.wiki_scraping import *


def get_vectorstore(persist_directory,contentId):
    try:
        embedding=OpenAIEmbeddings()
        # vectordb=get_vectordb(persist_directory,embedding)
        # if vectordb is None:
        #     return None
        # session["retriever"] = persist_directory
        # return contentId
        return True
    except (e):
        print(e)
        return False

'''
In order to create a vectorstore:
- download the PDF of the wiki page directly from WIKIPEDIA (download as pdf)
- please note that the "title" of the page will be used later on
- put the PDF file in the folder: static/wiki
- choose an ID for the content chosen -> contentId
- use the wiki_page(title) to get the page associated to the specified "title" -> page
- use the wiki_text_content(content) to get the processed text from the wiki page: content is page.content -> text
- count the TOKENS for the text with count_tokens(text, model_name)
- decide how to chunck (chunck_size and chunk_overlap)
'''
def create_vectorstore():

    model_name="gpt-3.5-turbo-0613"
    title="Moto rettilineo"

    page=wiki_page(title)
    text=wiki_content_text(page.content)
    num_tokens=count_tokens(text,model_name)
    print(num_tokens)

    # contentId=1
    # persist_directory='./vector_store/store_'+contentId
    # embedding=OpenAIEmbeddings()
    