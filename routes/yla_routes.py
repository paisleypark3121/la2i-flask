import os
from flask import Blueprint,Flask, request, jsonify, render_template, redirect, url_for, session, flash, send_file

yla_blueprint = Blueprint('yla', __name__)

@yla_blueprint.route('/yla')
def yla():
    return render_template("yla.html")