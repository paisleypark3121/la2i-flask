from langchain.embeddings import OpenAIEmbeddings
from utilities.chromadb_manager import *


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
