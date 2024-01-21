import os
import base64
from dotenv import load_dotenv

from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from datetime import datetime, timedelta
from flask_session import Session
from auth_routes import auth_blueprint
import fitz

from langchain.embeddings import OpenAIEmbeddings
from utilities.chat_bot_manager import ChatBotManager,system_message,get_client
from utilities.chromadb_manager import *
from utilities.MindMapGenerator import *
#from utilities.FAISS_manager import *

from urllib.parse import urlparse
from utilities.credentials import *


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
        model = session.get("model")
        if model is None:
            model='gpt-3.5-turbo-0613'
            session["model"] = model
        return render_template("chat.html", model=model)
    else:
        return redirect(url_for("auth.login"))  # Use the blueprint name for redirect

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.form.get("user_message") 
    user_id = session.get("user_id")
    model = session.get("model")
    
    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if user_message is None:
        return jsonify({"error": "Empty message"}), 500
    if model is None:
        model='gpt-3.5-turbo-0613'
        session["model"] = model
    
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
    
    chat_bot_manager = ChatBotManager(
        model=model,
        messages=messages,
        retriever=retriever)
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


@app.route('/update_option', methods=['POST'])
def update_option():
    option = request.json['option']
    if option == 'standard':
        session["model"]='gpt-3.5-turbo-0613'
    else:
        session["model"]=os.environ.get('FINE_TUNED_MODEL')
    print(session.get("model"))
    return session.get("model")

@app.route('/clear_history', methods=['POST'])
def clear_chat_history():
    session['messages'] = []  # Clear the chat messages in the session
    session['retriever'] = None  # Clear the retriever information in the session
    return jsonify(success=True)


@app.route("/mindmap", methods=["GET", "POST"])
def mindmap():
    user_id = session.get("user_id")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401

    messages = session.get("messages")

    if messages is None:
        return jsonify({"error": "No messages available"}), 404

    persist_directory = session.get("retriever")

    retriever = None
    if persist_directory:
        embeddings = OpenAIEmbeddings()
        vectordb = get_vectordb(
            persist_directory=persist_directory,
            embedding=embeddings)
        retriever = vectordb.as_retriever()

    last_assistant_message = None

    for message in reversed(messages):
        if message["role"] == "assistant":
            last_assistant_message = message["content"]
            break

    if last_assistant_message is None:
        return jsonify({"error": "No assistant message available"}), 404

    print(last_assistant_message)
    image_content = generateMindMap(text=last_assistant_message)

    # Encode the image content as base64
    encoded_image = base64.b64encode(image_content).decode("utf-8")
    return {"image_content": encoded_image}


@app.route("/mindmap_with_content", methods=["POST"])
def mindmap_with_content():
    user_id = session.get("user_id")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401

    data = request.get_json()

    # Check if the 'message' key exists in the JSON data
    if 'message' in data:
        message = data['message']

    if message is None:
        return jsonify({"error": "No messages available"}), 404

    print(message)
    image_content = generateMindMap(text=message)

    # Encode the image content as base64
    encoded_image = base64.b64encode(image_content).decode("utf-8")
    return {"image_content": encoded_image}


@app.route("/credentials")
def credentials_panel():
    return render_template("credentials.html")

# Function to check if a username exists
def username_exists(username):
    with open("utilities/users.json", "r") as file:
        user_data = json.load(file)
        for user in user_data:
            if user["username"] == username:
                return True
    return False

@app.route("/create_user", methods=["POST"])
def create_user():
    username = request.form.get("username")
    password = request.form.get("password")

    if username_exists(username):
        response_data = {
            "message": "Username already exists.",
            "status": "error"
        }
        return jsonify(response_data), 400  # Return JSON response with a 400 (Bad Request) status code
    else:
        insert_user(username, password)
        response_data = {
            "message": "User created successfully.",
            "status": "success"
        }
        return jsonify(response_data), 200  # Return JSON response with a 200 (OK) status code

@app.route("/delete_user", methods=["POST"])
def delete_user():
    username = request.form.get("username")

    if username_exists(username):
        delete_myuser(username)  # Correctly pass the username as an argument
        response_data = {
            "message": "User deleted successfully.",
            "status": "success"
        }
        return jsonify(response_data), 200  # Return JSON response with a 200 (OK) status code
    else:
        response_data = {
            "message": "Username not found.",
            "status": "error"
        }
        return jsonify(response_data), 404  # Return JSON response with a 404 (Not Found) status code

@app.route("/test_credentials", methods=["POST"])
def test_credentials():
    username = request.form.get("username")
    password = request.form.get("password")

    if check_credentials(username, password):
        response_data = {
            "message": "Credentials are valid.",
            "status": "success"
        }
        return jsonify(response_data), 200  # Return JSON response with a 200 (OK) status code
    else:
        response_data = {
            "message": "Invalid credentials.",
            "status": "error"
        }
        return jsonify(response_data), 401  # Return JSON response with a 401 (Unauthorized) status code

@app.route("/list_credentials", methods=["GET"])
def list_credentials():
    with open("utilities/users.json", "r") as file:
        user_data = json.load(file)
    return jsonify(user_data)

@app.route("/test")
def test():
    return render_template("test.html")

if __name__ == "__main__":
    app.run(debug=True)
