import os
from dotenv import load_dotenv
import json
from chromadb_manager import *
from openai import OpenAI

import io
import fitz
import pdfplumber

from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from chromadb_manager import *

class TextColors:
    RESET = "\033[0m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    PURPLE = "\033[95m"
    CYAN = "\033[96m"

system_message="Il tuo ruolo è essere un assistente disponibile con un tono amichevole, "\
    "comprensivo, paziente e affermativo nei confronti dell'utente. "\
    "Dovresti spiegare argomenti in frasi brevi e semplici, "\
    "mantenendo le spiegazioni in massimo 2 o 3 frasi. "\
    "Se l'utente fornisce risposte affermative o brevi, "\
    "prendi l'iniziativa di continuare con informazioni pertinenti. "\
    "Verifica la comprensione dell'utente dopo ogni breve spiegazione "\
    "utilizzando domande variegate e amichevoli. "\
    "Usa elenchi ordinati o non ordinati "\
    "(se più lunghi di 2 elementi, introducili uno alla volta e verifica la comprensione prima di procedere) "\
    "o testo semplice nelle risposte "\
    "Fornisci esempi o metafore se l'utente non comprende. "\
    "Utilizza le seguenti informazioni aggiuntive dal [context] (se presente) per recuperare informazioni; "\
    "se non riesci a recuperare alcuna informazione dal [context], usa le tue conoscenze "\
    "[context] {context}"

rolling = 10
model_name='gpt-3.5-turbo-0613'
#model_name='gpt-4-0613'
#model_name='ft:gpt-3.5-turbo-1106:personal::8UezGKAU'


def set_messages(messages, rolling):
    num_entries = len(messages)
    num_couples = (num_entries - 1) // 2 

    if num_couples <= rolling:
        return messages  
        
    couples_to_remove = num_couples - rolling

    removed_couples = 0
    index = 1  
    while removed_couples < couples_to_remove:
        if messages[index]["role"] == "user" and messages[index + 1]["role"] == "assistant":
            del messages[index]
            del messages[index] 
            removed_couples += 1
        else:
            index += 1

    return messages

def do_chat():

    print(TextColors.RESET)

    load_dotenv()
    chunk_size = 1200
    chunk_overlap = 200

    embedding=OpenAIEmbeddings()
    persist_directory='./vector_store/test'
    location="../files/il gufo.txt"

    vectordb=create_vectordb_from_location(
        location=location,
        embedding=embedding,
        model_name=model_name,
        persist_directory=persist_directory,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap)
    #retriever = vectordb.as_retriever()

    #client=OpenAI()

    # messages=[]
    # messages.append({"role":"system","content":system_message})

    # try:
    #     print("\n***WELCOME***\n")
    #     while True:
    #         print(TextColors.BLUE)
    #         user_message = input("\nUser: ")
    #         print(TextColors.RESET)   
            
    #         messages.append({"role":"user","content":user_message})
        
    #         #print(TextColors.CYAN)
    #         #print(messages)
    #         #print(TextColors.RESET)   

    #         #docs=retriever.get_relevant_documents(user_message)
    #         docs=vectordb.similarity_search_with_relevance_scores(user_message)

    #         #print(TextColors.GREEN)
    #         #print(len(docs))
    #         #print(docs)
    #         #print(docs[0][0].page_content)
    #         #print(docs[1][0].page_content)
    #         result=docs[0][0].page_content+"\n\n"+docs[1][0].page_content
    #         #print(TextColors.RESET)   

    #         updated_system_message=system_message.replace("{context}", result)
    #         messages[0]["content"]=updated_system_message
            
    #         #bot_response = "This is a fake bot response: "+user_message
    #         response = client.chat.completions.create(
    #             model=model,
    #             messages=messages,
    #             temperature=0,
    #             max_tokens=400,
    #             top_p=1,
    #             frequency_penalty=0,
    #             presence_penalty=0
    #         )

    #         answer=response.choices[0].message.content
            
    #         print(TextColors.RED)
    #         print("Assistant: "+answer)
    #         print(TextColors.RESET)   

    #         messages.append({"role": "assistant", "content": answer})            
    #         messages = set_messages(messages,rolling)

    # except KeyboardInterrupt:
    #     print("BYE BYE!!!")

do_chat()        