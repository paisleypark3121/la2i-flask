import os
from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file


test_blueprint = Blueprint('test', __name__)


@test_blueprint.route('/show/<filename>')
def show(filename):
    try:
        file_path = os.path.join('./files/', filename)

        print(file_path)

        # Check if the file exists
        if os.path.exists(file_path):
            
            return send_file(file_path)
        else:
            return "File not found", 404
    except FileNotFoundError:
        # Handle file not found error
        abort(404)

@test_blueprint.route("/test")
def test():

    # from langchain.chat_models import ChatOpenAI
    # from langchain.embeddings.openai import OpenAIEmbeddings
    # from langchain.vectorstores.chroma import Chroma
    # from langchain.chains.summarize import load_summarize_chain
    # from langchain.prompts import PromptTemplate
    # from langchain.chains.combine_documents.stuff import StuffDocumentsChain
    # from langchain.chains.llm import LLMChain
    # from langchain.vectorstores import Chroma
    # from langchain.embeddings import OpenAIEmbeddings
    # from langchain.text_splitter import RecursiveCharacterTextSplitter
    # from langchain.schema.document import Document
    

    return render_template("test.html")
    # model='gpt-3.5-turbo-0613'
    # temperature=0
    # llm = ChatOpenAI(model=model,temperature=0)
    # embedding=OpenAIEmbeddings()

    # chunk_size = 1200
    # chunk_overlap = 200

    # user_id = "user1"
    # persist_directory='./vector_store/'+user_id
        
    # contents=""
    # filename="./files/Giai - testo - editable.pdf"
    # pdf_document = fitz.open(filename)
    # content = ""
    # for page_num in range(len(pdf_document)):
    #     page = pdf_document[page_num]
    #     content = content + page.get_text() + "\n"
            
    # text_splitter = RecursiveCharacterTextSplitter(
    #     chunk_size=chunk_size,
    #     chunk_overlap=chunk_overlap, 
    #     length_function=len
    # )
    
    # texts = text_splitter.split_text(content)
    # splits = [Document(page_content=t) for t in texts]
    
    # try:
    #     delete_persist_directory(persist_directory)
    # except Exception as e:
    #     error="error in deleting vectorestore: "+str(e)
    #     print(error)

    # try:
    #     Chroma.from_documents(
    #         documents=splits, 
    #         embedding=embedding, 
    #         collection_metadata={"hnsw:space": "cosine"},
    #         persist_directory = persist_directory
    #     )
    #     print("created")

    #     vectordb=get_vectordb(persist_directory,embedding)
    #     docs=vectordb.get()['documents']
    #     print(docs[0][:100])

    # except Exception as e:
    #     error="error in creating vectorestore: "+str(e)
    #     print(error)
    
    # try:
    #     delete_persist_directory(persist_directory)
    # except Exception as e:
    #     error="error in deleting vectorestore: "+str(e)
    #     print(error)

    # contents=""
    # filename="./files/DHCP.pdf"
    # pdf_document = fitz.open(filename)
    # content = ""
    # for page_num in range(len(pdf_document)):
    #     page = pdf_document[page_num]
    #     content = content + page.get_text() + "\n"
            
    # text_splitter = RecursiveCharacterTextSplitter(
    #     chunk_size=chunk_size,
    #     chunk_overlap=chunk_overlap, 
    #     length_function=len
    # )
    
    # texts = text_splitter.split_text(content)
    # splits = [Document(page_content=t) for t in texts]

    # try:
    #     Chroma.from_documents(
    #         documents=splits, 
    #         embedding=embedding, 
    #         collection_metadata={"hnsw:space": "cosine"},
    #         persist_directory = persist_directory
    #     )
    #     print("created")

    #     vectordb=get_vectordb(persist_directory,embedding)
    #     docs=vectordb.get()['documents']
    #     print(docs[0][:100])

    # except Exception as e:
    #     error="error in creating vectorestore: "+str(e)
    #     print(error)
    
    # user_id = "user1"
    # persist_directory='./vector_store/'+user_id

    # model='gpt-3.5-turbo-0613'
    # temperature=0
    # llm = ChatOpenAI(model=model,temperature=0)
    # embedding=OpenAIEmbeddings()
    
    # contents=""
    # filename="./files/Giai - testo - editable.pdf"
    # pdf_document = fitz.open(filename)
    # content = ""
    # for page_num in range(len(pdf_document)):
    #     page = pdf_document[page_num]
    #     content = content + page.get_text() + "\n"
    
    # #print(content)
    # vectordb = create_vectordb_from_content(
    #     content=content,
    #     embedding=embedding,
    #     persist_directory=persist_directory)

    # # vectordb2=get_vectordb(persist_directory,embedding)
    # # #docs=vectordb2.get()['documents']

    # vectordb3 = create_vectordb_from_content(
    #     content=content,
    #     embedding=embedding,
    #     persist_directory=persist_directory)
    
    return "OK"

# @app.route("/process_file", methods=["POST"])
# def process_file():
#     uploaded_file = request.files.get("file")

#     if not uploaded_file:
#         return jsonify({"success": False, "message": "No file uploaded"}), 400

#     user_id = session.get("user_id")
#     if user_id is None:
#         return jsonify({"error": "User not authenticated"}), 401

#     if uploaded_file.filename.endswith(".pdf"):
#         pdf_document = fitz.open(stream=uploaded_file.read(), filetype="pdf")
#         content = ""
#         for page_num in range(len(pdf_document)):
#             page = pdf_document[page_num]
#             content = content + page.get_text() + "\n"
#     else:
#         content = uploaded_file.read().decode("utf-8")

#     embeddings=OpenAIEmbeddings()
#     persist_directory='./vector_store/'+user_id
#     vectordb = create_vectordb_from_content(
#         content=content,
#         embedding=embeddings,
#         persist_directory=persist_directory)
#     #retriever = vectordb.as_retriever()
#     if vectordb is None:
#         return jsonify({"success": False, "message": "Error in creating vectordb"}), 200
    
#     session["retriever"] = persist_directory
#     return jsonify({"success": True, "message": "Retriever created and stored"}), 200
