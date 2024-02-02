import os
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from utilities.credentials import *


credentials_blueprint = Blueprint('credentials', __name__)


def username_exists(username):
    with open("utilities/users.json", "r") as file:
        user_data = json.load(file)
        for user in user_data:
            if user["username"] == username:
                return True
    return False

@credentials_blueprint.route("/create_user", methods=["POST"])
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

@credentials_blueprint.route("/delete_user", methods=["POST"])
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

@credentials_blueprint.route("/test_credentials", methods=["POST"])
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

@credentials_blueprint.route("/list_credentials", methods=["GET"])
def list_credentials():
    with open("utilities/users.json", "r") as file:
        user_data = json.load(file)
    return jsonify(user_data)

@credentials_blueprint.route('/list')
def list_files():
    files = os.listdir('./files/')
    files_text = '<br>'.join(files)
    return files_text

