import os

from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file


from langchain.embeddings import OpenAIEmbeddings
from utilities.chromadb_manager import *

filemanagement_blueprint = Blueprint('filemanagement', __name__)


@filemanagement_blueprint.route("/upload_file", methods=["POST"])
def upload_file():
    file = request.files.get("file") 

    if not file:
        return jsonify({"success": False, "message": "No file provided."}), 400

    try:
        save_path = os.path.join("files", file.filename)
        file.save(save_path)

        return jsonify({"success": True, "message": "File upload completed."}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"File upload failed: {str(e)}"}), 500

@filemanagement_blueprint.route("/download_file", methods=["POST"])
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
