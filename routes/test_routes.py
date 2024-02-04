import os
import base64
from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file
from utilities.MindMapGenerator import *


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
    return render_template("test.html")

@test_blueprint.route("/test_content")
def test_content():
    json_string="""{"nodes": ["Planet Earth", "Life", "Natural Wonders", "Delicate Balance"], "labels": [{"label": "Harbors", "smooth": {"type": "continuous", "enabled": false}, "from": "Planet Earth", "to": "Life"}, {"label": "Contains", "smooth": {"type": "continuous", "enabled": false}, "from": "Planet Earth", "to": "Natural Wonders"}, {"label": "Maintains", "smooth": {"type": "continuous", "enabled": false}, "from": "Planet Earth", "to": "Delicate Balance"}]}"""
    image_content=json_to_image(json_string)    
    image_content_base64 = base64.b64encode(image_content).decode('utf-8')
    return {"image_content": image_content_base64}