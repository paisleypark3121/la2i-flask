import os
import base64

from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file
from utilities.chat_bot_manager import *
from utilities.content_manager import *

wikichat_blueprint = Blueprint('wikichat', __name__)

default_model='gpt-3.5-turbo-0613'
default_physics=False

wiki_content_data = [
    {"id": 1, "title": "Moto rettilineo", "description": "In  fisica,  il  moto  rettilineo  è  un  moto  in  cui  il  corpo  considerato  come  punto  materiale  si  muove mantenendo una direzione costante: un esempio intuitivo è quello di un'automobile che viaggia lungo una strada dritta, ossia un moto la cui direzione coincide costantemente con la retta sulla quale il corpo si sposta. [...]"},
    {"id": 2, "title": "Wiki Content 2", "description": "Description for Wiki Content 2"},
    {"id": 3, "title": "Wiki Content 3", "description": "Description for Wiki Content 3"}
]

@wikichat_blueprint.route('/wiki_contents')
def wiki_contents():
    return render_template('wiki_contents.html', content_data=wiki_content_data)
    
@wikichat_blueprint.route('/wiki_content')
def wiki_content():

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

        contentId = request.args.get('contentId')
        if contentId:
            handle_content_result=handle_content(contentId)
        
        print(model)
        print(language)
        print(contentId)

        return render_template(
            "wiki_content.html", 
            model=model, 
            language=language, 
            physics=physics,
            contentId=contentId)

    else:
        return redirect(url_for("auth.login"))

@wikichat_blueprint.route("/wikichat")
def wikichat():
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
        
        print(model)
        print(language)

        return render_template(
            "wikichat.html", 
            model=model, 
            language=language, 
            physics=physics)
    else:
        return redirect(url_for("auth.login"))

@wikichat_blueprint.route("/wikipedia_retriever", methods=["POST"])
def wikipedia_retriever():
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

    chat_bot_manager = ChatBotManager(
        language=language,
        model=model,
        messages=messages)

    if messages is None:
        # print("HERE ARE THE MESSAGES")
        # print(chat_bot_manager.messages)
        session["messages"]=chat_bot_manager.messages
    
    bot_response = chat_bot_manager.handle_wiki(user_message)

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