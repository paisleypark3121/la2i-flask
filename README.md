Create the project using poetry:
poetry new PROJECT_NAME

Enter the project directory:
cd PROJECT_NAME

Add flask:
poetry add flask

Create the basic Flask Structure in app.py to be located in the internal project directory created by poetry:
/**** APP.PY ****/
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return "Hello World"

if __name__ == '__main__':
    app.run(debug=True)
/**** ****** ****/

Then run like this:
poetry run python app.py