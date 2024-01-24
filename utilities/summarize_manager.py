from langchain.chat_models import ChatOpenAI
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores.chroma import Chroma
from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.chains.llm import LLMChain


def summarize(language,model,embeddings, vectordb):
    temperature=0
    llm = ChatOpenAI(model=model,temperature=0)

    search = vectordb.similarity_search(" ")

    prompt_template = """Please, write a summary with 500 words of the following:
        {text}
        SUMMARY:"""
    prompt = PromptTemplate.from_template(prompt_template)
    if language=='italian':
        prompt_template = """Perfavore, scrivi un riassunto di al più 500 parole in lingua italiana del seguente:
        {text}
        RIASSUNTO:"""
        prompt = PromptTemplate.from_template(prompt_template)

    llm_chain = LLMChain(llm=llm, prompt=prompt)
    stuff_chain = StuffDocumentsChain(llm_chain=llm_chain, document_variable_name="text")
    result = stuff_chain.run(search)
    print(result)
    return result

# import os
# from dotenv import load_dotenv
# from chromadb_manager import *

# def test():

#     load_dotenv()

#     model='gpt-3.5-turbo-0613'
#     temperature=0
#     llm = ChatOpenAI(model=model,temperature=0)
#     embedding=OpenAIEmbeddings()

#     user_id = "user1"
#     persist_directory='./vector_store/'+user_id
        
#     contents=""
#     filename="../files/Giai - testo - editable.pdf"
#     pdf_document = fitz.open(filename)
#     content = ""
#     for page_num in range(len(pdf_document)):
#         page = pdf_document[page_num]
#         content = content + page.get_text() + "\n"
    
#     #print(content)
#     vectordb = create_vectordb_from_content(
#         content=content,
#         embedding=embedding,
#         persist_directory=persist_directory)

#     # vectordb2=get_vectordb(persist_directory,embedding)
#     # #docs=vectordb2.get()['documents']

#     vectordb3 = create_vectordb_from_content(
#         content=content,
#         embedding=embedding,
#         persist_directory=persist_directory)

#     # vectordb4=get_vectordb(persist_directory,embedding)

        
# test()