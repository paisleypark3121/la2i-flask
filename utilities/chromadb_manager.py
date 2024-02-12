import os
import re
from dotenv import load_dotenv
import shutil
import json

import io
import fitz
import pdfplumber
import tiktoken

import requests

from youtube_transcript_api import YouTubeTranscriptApi

from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema.document import Document

'''returns the number of token for the text provided according to the model_name'''
def count_tokens(text, model_name):
    if not text:
        return 0
    encoding = tiktoken.encoding_for_model(model_name)
    num_tokens = len(encoding.encode(text))
    return num_tokens

'''
Returns the splits using RecursiveCharacterTextSplitter
chunk_size and chunk_overlap are in terms of tokens and not characters
'''
def get_splits(text,chunk_size,chunk_overlap,model_name):
    text_splitter=RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        model_name=model_name)
    texts = text_splitter.split_text(text)
    return texts

'''delete the persist_directory if exists'''
def delete_persist_directory(persist_directory):
    if os.path.exists(persist_directory) and os.path.isdir(persist_directory):
        # Use shutil.rmtree to remove the directory and its contents recursively
        shutil.rmtree(persist_directory)
        
        print(f"All contents inside '{persist_directory}' have been cleaned.")
    else:
        print(f"The directory '{persist_directory}' does not exist.")

'''returns the text from the local txt file'''
def get_local_text(filename):
    with open(filename, "r", encoding="utf-8") as local_file:
        return local_file.read()
    return None
# filename="files/jokerbirot_space_musician_en.txt"
# content=get_local_text(filename)
# print(content[0:30])

'''returns the text from the remote txt file'''
def get_remote_text(url):
    response = requests.get(url)
    if response.status_code == 200:
        return response.text        
        #contenuto_file=response.text.encode('utf-8')
    return None
#url="https://www.gutenberg.org/cache/epub/61830/pg61830.txt"
# url="https://raw.githubusercontent.com/paisleypark3121/la2i/main/files/jokerbirot_space_musician_en.txt"
# content=get_remote_text(url)
# print(content[0:30])

'''returns the text from the local pdf file'''
def get_local_pdf(filename):
    pdf_text = ""
    with fitz.open(filename) as pdf_document:
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            pdf_text += page.get_text() + "\n"  # Aggiungi un ritorno a capo tra le pagine
    return pdf_text
    return None
# filename="files/DHCP.pdf"
# content=get_local_pdf(filename)
# print(content)

'''returns the text from the remote pdf file'''
def get_remote_pdf(url):
    response = requests.get(url)
    if response.status_code == 200:
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            pdf_text = ""
            for page in pdf.pages:
                pdf_text += page.extract_text()
            return pdf_text.strip()
    return None
# url="https://sds-platform-private.s3-us-east-2.amazonaws.com/uploads/PT741-Transcript.pdf"
# content=get_remote_pdf(url)
# print(content[0:1000])

'''returns the youtube id from the given youtube url'''
def extract_youtube_id(url):
    youtube_id_match = re.search(r'(?<=v=)[^&#]+', url)
    youtube_id_match = youtube_id_match or re.search(r'(?<=be/)[^&#]+', url)
    return youtube_id_match.group(0) if youtube_id_match else None

'''
returns the youtube transcript from the given url
if the trascript for the language_code is present (english is the default)
it is provided as response, otherwise the (GENERATED) one is checked
the number of iteration is handled internally in order to stop the check if this is >=3
'''
def get_youtube_transcript(url, language_code="en", iteration=0):
    try:
        if iteration >= 3:
            return None 
        id = extract_youtube_id(url)
        transcript_list = YouTubeTranscriptApi.list_transcripts(id)
        transcript = transcript_list.find_transcript([language_code])
        full_transcript = transcript.fetch()
        concatenated_text = ""
        for item in full_transcript:
            concatenated_text += item['text'] + ' '
        concatenated_text = concatenated_text.strip()
        return concatenated_text
    except Exception as e:
        if "(GENERATED)" in str(e):
            generated_section = str(e).split("(GENERATED)")[-1].strip()
            if "-" in generated_section:
                new_language_code = generated_section.split("-")[1][:3].strip()
                if new_language_code:
                    return get_youtube_transcript(url, new_language_code, iteration + 1)
        return None
# url="https://www.youtube.com/watch?v=AgZCmiC4Zr8"
# content=get_youtube_transcript(url,language_code="it")
# print(content[0:100])
# url="https://www.youtube.com/watch?v=O0dUOtOIrfs"
# content=get_youtube_transcript(url)
# print(content[0:100])

'''
returns the text content associated to the local or remote file / url
- location can be a local or remote txt
- location can be a local or remote pdf
- location can be youtube url
'''
def get_content(location):
    if location.startswith("http"):
        if location.endswith(".txt"):
            content=get_remote_text(location)
        elif location.endswith(".pdf"):
            content=get_remote_pdf(location)
        elif "youtube.com" in location:
            content=get_youtube_transcript(location)
        else:
            content=None
    elif os.path.isfile(location):
        if location.endswith(".txt"):
            content=get_local_text(location)
        elif location.endswith(".pdf"):
            content=get_local_pdf(location)
    else:
        content=None

    return content

from langchain.retrievers import WikipediaRetriever
def get_wikipedia(query):
    retriever = WikipediaRetriever()
    docs = retriever.get_relevant_documents(query)
    #print(docs[0].metadata)
    #print(docs[0].page_content[:100])
    return docs

def create_vectordb(
    location, 
    embedding, 
    persist_directory=None, 
    chunk_size=1200, 
    chunk_overlap=200):

    if location.startswith("http"):
        if location.endswith(".txt"):
            content=get_remote_text(location)
        elif location.endswith(".pdf"):
            content=get_remote_pdf(location)
        elif "youtube.com" in location:
            content=get_youtube_transcript(location)
        else:
            content=None
    elif os.path.isfile(location):
        if location.endswith(".txt"):
            content=get_local_text(location)
        elif location.endswith(".pdf"):
            content=get_local_pdf(location)
    else:
        content=None

    if content is None:
        return None

    # if len(content) < 5000:
    #     chunk_size = 500
    #     chunk_overlap = 50
    # else:
    #     # Use the default values when the length is not smaller than 5000
    #     chunk_size = 1200
    #     chunk_overlap = 200
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap, 
        length_function=len,
    )
    
    texts = text_splitter.split_text(content)
    splits = [Document(page_content=t) for t in texts]
    
    try:
        vectordb=get_vectordb(persist_directory,embedding)
        if vectordb:
            vectordb.delete_collection()
            print("collection deleted in "+persist_directory)

        vectordb=Chroma.from_documents(
            documents=splits, 
            embedding=embedding, 
            collection_metadata={"hnsw:space": "cosine"},
            persist_directory = persist_directory
        )

        # response_data = {"success": True, "message": "vectorestore created successfully"}
        # response_json = json.dumps(response_data)
        # return response_json
        return vectordb

    except Exception as e:
        error="error in creating vectorestore: "+str(e)
        # response_data = {"success": False, "message": error}
        # return json.dumps(response_data)
        print(error)
        return None

async def create_vectordb_from_content(
    content, 
    embedding, 
    persist_directory,
    chunk_size=1200, 
    chunk_overlap=200):
    
    if content is None:
        return None
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap, 
        length_function=len
    )
    
    # texts = text_splitter.split_text(content)
    # splits = [Document(page_content=t) for t in texts]
    splits = await text_splitter.createDocuments([text]);
    
    # try:
    #     delete_persist_directory(persist_directory)
    # except Exception as e:
    #     error="error in creating vectorestore: "+str(e)
    #     print(error)

    # vectordb=Chroma.from_documents(
    #     documents=splits, 
    #     embedding=embedding, 
    #     collection_metadata={"hnsw:space": "cosine"},
    #     persist_directory = persist_directory
    # )
    #vectordb.persist()

    try:
        vectordb=get_vectordb(persist_directory,embedding)
        if vectordb:
            vectordb.delete_collection()
            print("collection deleted")

        vectordb=Chroma.from_documents(
            documents=splits, 
            embedding=embedding, 
            collection_metadata={"hnsw:space": "cosine"},
            persist_directory = persist_directory
        )

        # response_data = {"success": True, "message": "vectorestore created successfully"}
        # response_json = json.dumps(response_data)
        # return response_json
        return vectordb

    except Exception as e:
        error="error in creating vectorestore: "+str(e)
        # response_data = {"success": False, "message": error}
        # return json.dumps(response_data)
        print(error)
        return None

'''
returns the vectordb for the given location
- location can be a local or remove txt, pdf or youtube video
- embedding is how to embed data into the vector store
- model_name is used to calculate the tokens
- chunk_size and chunk_overlap is "token" based (not characters)
'''
def create_vectordb_from_location(
    location, 
    embedding, 
    model_name,
    persist_directory=None,    
    chunk_size=1200, 
    chunk_overlap=200):

    content=get_content(location)
    if content is None:
        return None
        
    return create_vectordb_from_text(
        content=content,
        embedding=embedding,
        model_name=model_name,
        persist_directory=persist_directory,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap)

'''
returns the vectordb for the given location
- content is the textual content
- embedding is how to embed data into the vector store
- model_name is used to calculate the tokens
- chunk_size and chunk_overlap is "token" based (not characters)
'''
def create_vectordb_from_text(
    content, 
    embedding, 
    model_name,
    persist_directory=None,    
    chunk_size=1200, 
    chunk_overlap=200):

    if content is None:
        return None
        
    texts=get_splits(
        text=content,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        model_name=model_name)

    # print("Splits: "+str(len(texts)))
    # for text in texts:
    #     print(text[:10]+" - "+str(count_tokens(text,model_name)))

    documents = [Document(page_content=t) for t in texts]

    # print("Documents: "+str(len(documents)))
    # for document in documents:
    #     #print(document[:10]+" - "+str(count_tokens(document,model_name)))
    #     print(document.page_content[:10]+" - "+str(count_tokens(document.page_content,model_name)))
    
    try:
        vectordb=get_vectordb(persist_directory,embedding)
        if vectordb:
            vectordb.delete_collection()
            print("collection deleted in "+persist_directory)

        vectordb=Chroma.from_documents(
            documents=documents, 
            embedding=embedding, 
            collection_metadata={"hnsw:space": "cosine"},
            persist_directory = persist_directory
        )

        return vectordb

    except Exception as e:
        error="error in creating vectorestore: "+str(e)
        print(error)
        return None

# load_dotenv()
# #location="files/jokerbirot_space_musician_en.txt"
# location="files/DHCP.pdf"
# #location="https://raw.githubusercontent.com/paisleypark3121/la2i/main/files/jokerbirot_space_musician_en.txt"
# #location="https://sds-platform-private.s3-us-east-2.amazonaws.com/uploads/PT741-Transcript.pdf"
# #location="https://www.youtube.com/watch?v=O0dUOtOIrfs"
# embeddings=OpenAIEmbeddings()
# vectordb=create_vectordb(location,embeddings)
# #print(vectordb)
# retriever=vectordb.as_retriever()
# prompt="who is DHCP?"
# docs=retriever.get_relevant_documents(prompt)
# print(docs[0])

def get_vectordb(persist_directory,embedding):
    if persist_directory and os.path.exists(persist_directory):
        return Chroma(
            persist_directory=persist_directory,
            embedding_function=embedding)