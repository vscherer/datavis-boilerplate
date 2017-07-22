from flask import Flask, render_template
import pandas as pd
import numpy as np
import h5py
import os

# Configure the app
app = Flask(__name__)
script_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = script_dir + "/demo/data/"

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

@app.route('/data/<string:layername>/<int:epoch>')
def get_data(layername,epoch):
    #weights = np.ndarray

    # Get size of data
    epochnr = 20;
    file = h5py.File(log_dir + "weights00.hdf5", "r")
    matrix = file[layername][layername]["kernel:0"][:]
    (sizeX, sizeY) = matrix.shape

    """
    # Combine all the data
    weights = np.zeros((sizeX, sizeY, epochnr))
    for i in range(0, epochnr):
        if i < 10:
            file = h5py.File(log_dir + "weights0" + str(i) + ".hdf5", "r")
        else:
            file = h5py.File(log_dir + "weights" + str(i) + ".hdf5", "r")
        group = file[layername]
        group2 = group[layername]
        matrix = group2["kernel:0"][:]
        weights[:, :, i] = matrix
    """

    weights = np.zeros((sizeX, sizeY))
    if epoch < 10:
        file = h5py.File(log_dir + "weights0" + str(epoch) + ".hdf5", "r")
    else:
        file = h5py.File(log_dir + "weights" + str(epoch) + ".hdf5", "r")
    group = file[layername]
    group2 = group[layername]
    matrix = group2["kernel:0"][:]

    #data = pd.DataFrame(weights[:, :, epoch])
    return pd.DataFrame(matrix).to_csv()

if __name__ == '__main__':
    app.run(debug=True)

