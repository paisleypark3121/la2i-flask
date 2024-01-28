import os
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from utilities.credentials import *


auth_blueprint = Blueprint('auth', __name__)


# Route to render the login page
@auth_blueprint.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if username==os.environ.get('ADMIN_USERNAME') and password==os.environ.get('ADMIN_PASSWORD'):
        session["user_id"]=os.environ.get('ADMIN_USERNAME')
        return render_template("credentials.html")

    user=check_credentials(username, password)

    if user:
        session['user_id'] = username
        print("user "+username+" logged in")
        return redirect(url_for('home'))
    else:
        return jsonify({"error": "Incorrect username or password"}), 400

# Route to render the login page (GET request)
@auth_blueprint.route("/login", methods=["GET"])
def render_login_page():
    # Check if the user is already authenticated
    if 'user_id' in session:
        return redirect(url_for('home'))  # Redirect to the home page if authenticated
    else:
        return render_template("login.html")

# Route to log the user out
@auth_blueprint.route("/logout")
def logout():
    #session.pop('user_id', None)
    session.clear()
    return redirect(url_for('auth.login'))  # Use 'auth.login' as the endpoint
