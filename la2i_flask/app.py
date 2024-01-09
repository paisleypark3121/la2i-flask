from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from datetime import datetime, timedelta
from flask_session import Session
from auth_routes import auth_blueprint
import fitz

from langchain.embeddings import OpenAIEmbeddings
from utils.chat_bot_manager import ChatBotManager,system_message,get_client
from utils.chromadb_manager import *
#from utils.FAISS_manager import *

from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_NAME'] = 'your_session_cookie_name'
app.config['SESSION_COOKIE_HTTPONLY'] = True
#app.config['SESSION_USE_SIGNER'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=15)

Session(app)

app.register_blueprint(auth_blueprint)  # Register the blueprint

@app.route("/")
def home():
    if 'user_id' in session:
        return render_template("chat.html")
    else:
        return redirect(url_for("auth.login"))  # Use the blueprint name for redirect

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.form.get("user_message") 
    user_id = session.get("user_id") 

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if user_message is None:
        return jsonify({"error": "Empty message"}), 500

    messages = session.get("messages")

    if messages is None:
        messages = [{"role": "system", "content": system_message}]
        session["messages"] = messages

    persist_directory=session.get("retriever")

    retriever=None
    if persist_directory:
        embeddings=OpenAIEmbeddings()
        vectordb=get_vectordb(
            persist_directory=persist_directory,
            embedding=embeddings)
        retriever = vectordb.as_retriever()
    
    chat_bot_manager = ChatBotManager(messages,retriever)
    bot_response = chat_bot_manager.handle_message(user_message)

    return jsonify({"bot_response": bot_response})

@app.route("/process_file", methods=["POST"])
def process_file():
    uploaded_file = request.files.get("file")

    if not uploaded_file:
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401

    if uploaded_file.filename.endswith(".pdf"):
        pdf_document = fitz.open(stream=uploaded_file.read(), filetype="pdf")
        content = ""
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            content = content + page.get_text() + "\n"
    else:
        content = uploaded_file.read().decode("utf-8")

    embeddings=OpenAIEmbeddings()
    persist_directory='./vector_store/'+user_id
    vectordb = create_vectordb_from_content(
        content=content,
        embedding=embeddings,
        persist_directory=persist_directory)
    retriever = vectordb.as_retriever()

    session["retriever"] = persist_directory

    return jsonify({"success": True, "message": "Retriever created and stored"}), 200

@app.route("/upload_file", methods=["POST"])
def upload_file():
    file = request.files.get("file")  # Get the uploaded file

    if not file:
        return jsonify({"success": False, "message": "No file provided."}), 400

    try:
        # Define the path where you want to save the file
        save_path = os.path.join("files", file.filename)

        # Save the file locally
        file.save(save_path)

        return jsonify({"success": True, "message": "File upload completed."}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"File upload failed: {str(e)}"}), 500

@app.route("/download_file", methods=["POST"])
def download_file():
    data = request.json
    url = data.get("url")
    
    if not url:
        return jsonify({"success": False, "message": "No URL provided."}), 400

    try:
        parsed_url = urlparse(url)
        if not parsed_url.scheme:
            return jsonify({"success": False, "message": "Invalid URL format."}), 400
        filename = os.path.basename(parsed_url.path)
        save_path = os.path.join("files", filename)
        print(save_path)
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(save_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        return jsonify({"success": True, "filename": filename}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"File download failed: {str(e)}"}), 500

@app.route("/transcribe_youtube", methods=["POST"])
def transcribe_youtube():
    data = request.json
    url = data.get("url")
    #print(data)
    #print("URL: "+url)

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
    
    embeddings=OpenAIEmbeddings()
    persist_directory='./vector_store/'+user_id
    vectordb = create_vectordb_from_content(
        content=content,
        embedding=embeddings,
        persist_directory=persist_directory)
    retriever = vectordb.as_retriever()

    session["retriever"] = persist_directory

    return jsonify({"success": True, "message": "Retriever created and stored"}), 200




if __name__ == "__main__":
    app.run(debug=True)
