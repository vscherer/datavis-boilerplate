from flask import Flask, render_template
import pandas as pd
import numpy as np
import h5py
import os

# Configure the app
app = Flask(__name__)
script_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = script_dir + "/demo/data/"
weights = np.ndarray
setup = False
epochnr = 0


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


def load_data():
    """Initial loading of data into array"""
    # Get size of data
    epochnr = 20;
    file = h5py.File(log_dir + "weights00.hdf5", "r")
    matrix = file["dense_1"]["dense_1"]["kernel:0"][:]
    (sizeX, sizeY) = matrix.shape

    # Combine all the data
    global weights
    weights = np.zeros((sizeX, sizeY, epochnr))
    for i in range(0, epochnr):
        if i < 10:
            file = h5py.File(log_dir + "weights0" + str(i) + ".hdf5", "r")
        else:
            file = h5py.File(log_dir + "weights" + str(i) + ".hdf5", "r")
        group = file["dense_1"]
        group2 = group["dense_1"]
        matrix = group2["kernel:0"][:]
        weights[:, :, i] = matrix
    global setup
    setup = True


@app.route('/data/')
def get_data():
    """
    Example GET endpoint to get data from the backend.

    """
    if not setup:
        load_data()

    data = pd.DataFrame(weights[:, :, epochnr])

    # data = pd.DataFrame(np.random.randn(6,4))
    return data.to_csv()


@app.route('/epoch/<int:nr>')
def set_epoch(nr):
    """
    Updates the displayed weights to the parameter number
    :param nr: The requested epoch
    """
    global epochnr
    epochnr = nr
    print(nr)

if __name__ == '__main__':
    app.run(debug=True)

