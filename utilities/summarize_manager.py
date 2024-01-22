from langchain.chat_models import ChatOpenAI
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores.chroma import Chroma
from langchain.chains.summarize import load_summarize_chain

def summarize(embeddings, vectordb):
    model='gpt-3.5-turbo-0613'
    temperature=0
    llm = ChatOpenAI(model=model,temperature=0)

    chain = load_summarize_chain(llm, chain_type="stuff")
    search = vectordb.similarity_search(" ")
    summary = chain.run(
        input_documents=search, 
        question="Please write a summary within 2000 words")

    print(summary)
    
    return summary
