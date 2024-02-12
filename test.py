import os
from dotenv import load_dotenv
#https://api.python.langchain.com/en/v0.0.343/retrievers/langchain.retrievers.wikipedia.WikipediaRetriever.html#
from langchain.retrievers import WikipediaRetriever
from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI

from langchain.prompts import PromptTemplate

from utilities.chromadb_manager import *

load_dotenv()

model = ChatOpenAI(model_name="gpt-3.5-turbo-0613")
retriever = WikipediaRetriever()

# template="""
# Use the following pieces of context to answer the question at the end. 
# If you can't find the answer in the context, please use your internal knowledge.
#   ----------------
#   CONTEXT: {context}
#   ----------------
#   CHAT HISTORY: {chat_history}
#   ----------------
#   QUESTION: {question}
#   ----------------
#   Helpful Answer:
# """

# questionPrompt = PromptTemplate.from_template(template)

# qa = ConversationalRetrievalChain.from_llm(
#     model, 
#     retriever=retriever,
#     verbose=False,
#     combine_docs_chain_kwargs={"prompt": questionPrompt})

# question="who is Donald Trump?"
# chat_history = []

# result = qa(
#     {
#         "question": question, 
#         "chat_history": chat_history
#     }
# )

# print(result)

# query="who is Donald Trump?"
# docs=get_wikipedia(query)
# print(len(docs))

#for doc in docs:
#    print(doc)

# for doc in docs:
#     print(doc.metadata['title'])
#     print(doc.metadata['summary'][:100])
#     #print(doc.metadata['summary'])
#     print(doc.metadata['source'])
#     print("---")

#print(docs[0].page_content[:20])
# print(docs[0].metadata['title'])
# print(docs[0].metadata['summary'][:100])
# print(docs[0].metadata['source'])

# #as_retriever(search_kwargs={"k": 5})
# retriever = WikipediaRetriever()
# from langchain.chains import ConversationalRetrievalChain
# from langchain_openai import ChatOpenAI

# model = ChatOpenAI(model_name="gpt-3.5-turbo")  # switch to 'gpt-4'
# qa = ConversationalRetrievalChain.from_llm(model, retriever=retriever)

# question = "What is the Abhayagiri Vihāra?",
# chat_history = []

# result = qa({"question": question, "chat_history": chat_history})
# chat_history.append((question, result["answer"]))
