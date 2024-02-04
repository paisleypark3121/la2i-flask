import os
import base64

from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file
from utilities.MindMapGenerator import *


mindmap_blueprint = Blueprint('mindmap', __name__)


@mindmap_blueprint.route("/mindmap_with_content", methods=["POST"])
def mindmap_with_content():
    user_id = session.get("user_id")
    language = session.get("language")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if language is None:
        language = 'english'
        session["language"] = language

    data = request.get_json()

    if 'message' in data:
        message = data['message']
    if message is None:
        return jsonify({"error": "No messages available"}), 404
    print(message)

    type='small'
    if 'type' in data:
        type = data['type']
    print(type)

    image_content = generateMindMap(language=language,type=type,text=message)

    # Encode the image content as base64
    encoded_image = base64.b64encode(image_content).decode("utf-8")
    return {"image_content": encoded_image}

@mindmap_blueprint.route("/mindmap_enhanced", methods=["POST"])
def mindmap_enhanced():

    import networkx as nx
    from pyvis.network import Network
    import matplotlib.pyplot as plt

    user_id = session.get("user_id")
    language = session.get("language")
    physics = session.get("physics")

    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401
    if language is None:
        language = 'english'
        session["language"] = language
    if physics is None:
        physics = True
        session["physics"] = physics

    data = request.get_json()

    if 'message' in data:
        message = data['message']
    if message is None:
        return jsonify({"error": "No messages available"}), 404
    #print(message)

    type='small'
    if 'type' in data:
        type = data['type']
    #print(type)

    nt = generateInteractiveMindMap(
        language=language,
        type=type,
        text=message,
        physics=physics)

    html = nt.generate_html()
    html = html.replace("</head>", mm_js_code + "\n</head>")
    html = html.replace(network_on_old,network_on)
    #print(html)
    #nt.show("nx.html",notebook=False)

    json_string=pyvis_to_json(nt)

    return jsonify({"success": True, "html": html, "json_string": json_string}), 200

@mindmap_blueprint.route("/mindmap_json_to_image", methods=["POST"])
def mindmap_json_to_image():
    data = request.get_json()
    json_data = data.get('json_data')
    image_content=json_to_image(json_data)
    image_content_base64 = base64.b64encode(image_content).decode('utf-8')
    return {"image_content": image_content_base64}

# @app.route("/mindmap", methods=["GET", "POST"])
# def mindmap():
#     user_id = session.get("user_id")

#     if user_id is None:
#         return jsonify({"error": "User not authenticated"}), 401

#     messages = session.get("messages")

#     if messages is None:
#         return jsonify({"error": "No messages available"}), 404

#     persist_directory = session.get("retriever")

#     retriever = None
#     if persist_directory:
#         embeddings = OpenAIEmbeddings()
#         vectordb = get_vectordb(
#             persist_directory=persist_directory,
#             embedding=embeddings)
#         retriever = vectordb.as_retriever()

#     last_assistant_message = None

#     for message in reversed(messages):
#         if message["role"] == "assistant":
#             last_assistant_message = message["content"]
#             break

#     if last_assistant_message is None:
#         return jsonify({"error": "No assistant message available"}), 404

#     print(last_assistant_message)
#     image_content = generateMindMap(text=last_assistant_message)

#     # Encode the image content as base64
#     encoded_image = base64.b64encode(image_content).decode("utf-8")
#     return {"image_content": encoded_image}