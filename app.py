from flask import Flask, render_template
import pandas as pd
import numpy as np

# Configure the app
app = Flask(__name__)


@app.route('/')
def hello_world():
    """
    Serves the main template file.
    You probably do NOT want to modify this.
    """
    return render_template('index.html')


@app.after_request
def add_header(r):
    """
    Disable all caching.
    You probably do NOT want to modify this.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

#####################################
# REST backend interface


@app.route('/data/')
def get_data():
    """
    Example GET endpoint to get data from the backend.

    """
    data = pd.DataFrame(np.random.randn(6,4))
    return data.to_csv()


if __name__ == '__main__':
    app.run(debug=True)

