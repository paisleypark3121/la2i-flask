import os
from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file

content_blueprint = Blueprint('content', __name__)

content_data = [
    {"id": 1, "title": "Content 1", "description": "Description for Content 1"},
    {"id": 2, "title": "Content 2", "description": "Description for Content 2"},
    {"id": 3, "title": "Content 3", "description": "Description for Content 3"}
]

@content_blueprint.route('/content')
def content():
    return render_template('content.html', content_data=content_data)