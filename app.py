import os
import base64
import fitz

from dotenv import load_dotenv

from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file
from datetime import datetime, timedelta
from flask_session import Session

from routes.auth_routes import auth_blueprint
from routes.credentials_routes import credentials_blueprint
from routes.test_routes import test_blueprint
from routes.mindmap_routes import mindmap_blueprint
from routes.filemanagement_routes import filemanagement_blueprint
from routes.yla_routes import yla_blueprint
from routes.content_routes import content_blueprint
from routes.wikichat_routes import wikichat_blueprint

from langchain.embeddings import OpenAIEmbeddings
from utilities.chat_bot_manager import *
from utilities.chromadb_manager import *
#from utilities.FAISS_manager import *
from utilities.summarize_manager import *
from utilities.content_manager import *

from urllib.parse import urlparse
from utilities.credentials import *

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/')

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_NAME'] = 'your_session_cookie_name'
app.config['SESSION_COOKIE_HTTPONLY'] = True
#app.config['SESSION_USE_SIGNER'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=15)

Session(app)

app.register_blueprint(auth_blueprint)
app.register_blueprint(credentials_blueprint)
app.register_blueprint(test_blueprint)
app.register_blueprint(mindmap_blueprint)
app.register_blueprint(filemanagement_blueprint)
app.register_blueprint(yla_blueprint)
app.register_blueprint(content_blueprint)
app.register_blueprint(wikichat_blueprint)


default_model='gpt-3.5-turbo-0613'
default_physics=False
#default_model='gpt-4-0613'

@app.route("/")
def home():
    if 'user_id' in session:
        
        model = session.get("model")
        if model is None:
            model = default_model
            session["model"] = model

        language = session.get("language")
        if language is None:
            language = 'english'
            session["language"] = language

        physics=session.get("physics")
        if physics is None:
            physics = default_physics
            session["physics"] = physics

        handle_content_result=False
        contentId = request.args.get('contentId')
        if contentId:
            handle_content_result=handle_content(contentId)
        
        session['messages'] = []
        session['retriever'] = None

        print(model)
        print(language)
        print(contentId)

        if handle_content_result:
            #print("present")
            return render_template(
                "chat.html", 
                model=model, 
                language=language, 
                physics=physics,
                contentId=contentId)
        else:
            #print("not present")
            return render_template(
                "chat.html", 
                model=model, 
                language=language, 
                physics=physics)
    else:
        return redirect(url_for("auth.login"))

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.form.get("user_message") 
    user_id = session.get("user_id")
    model = session.get("model")
    language = session.get("language")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if user_message is None:
        return jsonify({"error": "Empty message"}), 500
    if model is None:
        model=default_model
        session["model"] = model
    if language is None:
        language='english'
        session["language"] = language
    
    messages = session.get("messages")
    persist_directory=session.get("retriever")

    retriever=None
    vectordb=None
    if persist_directory:
        embeddings=OpenAIEmbeddings()
        vectordb=get_vectordb(
            persist_directory=persist_directory,
            embedding=embeddings)
        #retriever = vectordb.as_retriever()
    
    chat_bot_manager = ChatBotManager(
        language=language,
        model=model,
        messages=messages,
        vectordb=vectordb)
        #retriever=retriever)

    if messages is None:
        # print("HERE ARE THE MESSAGES")
        # print(chat_bot_manager.messages)
        session["messages"]=chat_bot_manager.messages
    
    bot_response = chat_bot_manager.handle_message(user_message)

    return jsonify({"bot_response": bot_response})

# Modify the server-side code to handle the updated data structure
@app.route("/generate_chromadb", methods=["POST"])
def generate_chromadb():
    data = request.json
    items = data.get("items")

    if not items:
        return jsonify({"success": False, "message": "No items provided."}), 400

    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401

    model = session.get("model")
    if model is None:
        model = default_model
        session["model"] = model
        
    contents=""

    # Iterate through the list of items and their types
    for item in items:
        #print(item)
        item_data = item.get("item")  # Access the item's data
        item_type = item.get("type")  # Access the item's type (file or URL)

        filename="files/"+item_data
        if item_data.endswith(".pdf"):
            pdf_document = fitz.open(filename)
            content = ""
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                content = content + page.get_text() + "\n"
            contents=contents+content+"\n"
        else:
            with open(filename, 'r', encoding='utf-8') as file:
                content = file.read()
            contents=contents+content+"\n"    
    
    #print(contents)

    embeddings=OpenAIEmbeddings()
    persist_directory='./vector_store/'+user_id
    # vectordb = create_vectordb_from_content(
    #     content=content,
    #     embedding=embeddings,
    #     persist_directory=persist_directory)
    vectordb = create_vectordb_from_text(
        content=content,
        embedding=embeddings,
        model_name=model,
        persist_directory=persist_directory,
        # chunk_size=500,
        # chunk_overlap=50
        )
    #retriever = vectordb.as_retriever()
    if vectordb is None:
        return jsonify({"success": False, "message": "Error in creating vectordb"}), 200

    session["retriever"] = persist_directory
    return jsonify({"success": True, "message": "Retriever created and stored"}), 200

@app.route("/transcribe_youtube", methods=["POST"])
def transcribe_youtube():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"success": False, "message": "No YouTube URL provided."}), 400

    try:
        video_id = extract_youtube_id(url)
        
        if video_id:
            local_filename = os.path.join("files", f"{video_id}.txt")
        else:
            local_filename = os.path.join("files", "youtube_transcript.txt")

        #print(local_filename)
        transcript_content = get_youtube_transcript(url, language_code="en")
        #print(transcript_content)
        if transcript_content:
            with open(local_filename, 'w', encoding="utf-8") as f:
                f.write(transcript_content)

            return jsonify({"success": True, "filename": local_filename}), 200
        else:
            return jsonify({"success": False, "message": "No transcript available for this video."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"YouTube transcription failed: {str(e)}"}), 500

@app.route('/update_option', methods=['POST'])
def update_option():
    option = request.json['option']
    if option == 'standard':
        session["model"]=default_model
    else:
        language = session.get("language")
        if language is None:
            language = 'english'
            session["language"] = language
        session["model"]=os.environ.get('FINE_TUNED_MODEL')
        if language=="italian":
            session["model"]=os.environ.get('FINE_TUNED_MODEL_IT')
    print(session.get("model"))
    return session.get("model")

@app.route('/update_language', methods=['POST'])
def update_language():
    option = request.json['option']
    if option == 'italian':
        session["language"] = 'italian'
    else:
        session["language"] = 'english'
    print(session.get("language"))
    return jsonify({'language': session.get("language")})

@app.route('/update_physics', methods=['POST'])
def update_physics():
    physicsEnabled = request.json['physics']
    if physicsEnabled:
        session["physics"] = True
    else:
        session["physics"] = False
    print(session.get("physics"))
    return jsonify({'physics': session.get("physics")})

@app.route('/clear_history', methods=['POST'])
def clear_chat_history():
    session['messages'] = []  # Clear the chat messages in the session
    session['retriever'] = None  # Clear the retriever information in the session
    return jsonify(success=True)

@app.route("/get_summary", methods=["GET"])
def get_summary():
    user_id = session.get("user_id")
    language = session.get("language")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if language is None:
        language = 'english'
        session["language"] = language

    persist_directory = session.get("retriever")
    if persist_directory is None:
        return None

    retriever = None
    embeddings = OpenAIEmbeddings()
    vectordb = get_vectordb(
        persist_directory=persist_directory,
        embedding=embeddings)

    if vectordb is None:
        return None

    #retriever = vectordb.as_retriever()

    bot_response=summarize(
        language=language,
        model=default_model,
        embeddings=embeddings, 
        vectordb=vectordb)
    if bot_response is None:
        return None
    
    #bot_response=generateMindMap_context(summary)

    return jsonify({"bot_response": bot_response})
    
def handle_content(contentId):
    persist_directory='./vector_store/store_'+contentId
    response=get_vectorstore(
        contentId=contentId,
        persist_directory=persist_directory
    )

    if response:
        session["retriever"] = persist_directory
        return True
    
    return False

if __name__ == "__main__":
    #app.run(debug=True)
    app.run("0.0.0.0")