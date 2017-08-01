from flask import Flask, render_template, jsonify
import numpy as np
import h5py
import os, glob, re
import rapidjson
import argparse
import rapidjson

script_dir = os.path.dirname(os.path.abspath(__file__))
parser = argparse.ArgumentParser(description='Process some integers.')
parser.add_argument('--log_dir',
                    help='Path of the directory with HDF5 files',
                    default=script_dir + "/demo/data/")
args = parser.parse_args()

# Configure the app
app = Flask(__name__)
log_dir = args.log_dir #File path where data is stored
print (log_dir)

@app.route('/')
def hello_world():
    """
    Serves the main template file.
    """
    return render_template('index.html')


@app.after_request
def add_header(r):
    """
    Disable all caching.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

def _get_metadata():
    """
    Calculate meta information about the main data and return it to client.
    """
    # List parameter files
    if not os.path.exists(log_dir):
        return {}

    #Grab all .hdf5 files in log_dir
    files = sorted(glob.glob(log_dir + "/*.hdf5"))
    if len(files) == 0:
        return {}

    #Simple attributes
    attributes = {
        'epochs': len(files),
        'files': files,
        'datasets': {},
        'groups': {}
    }

    # Get other attributes (assume all files in 'files' have the same structure
    file = h5py.File(files[0], "r")

    def print_attrs(name, node):
        if isinstance(node, h5py.Dataset):
            # node is a dataset
            attributes['datasets'][name] = {
                'shape': node.shape
            }
        else:
            # node is a group
            attributes['groups'][name] = {}
            for key in node.attrs.keys():
                attributes['groups'][name][key] = str(node.attrs[key])

    file.visititems(print_attrs)
    return attributes

#####################################
# REST backend interface

@app.route('/meta')
def get_metadata():
    """
    Flask route for loadMetadata()
    """
    attributes = _get_metadata()
    return jsonify(attributes)

@app.route('/data/<string:layername>')
def get_data(layername):
    """
    Flask route for loadData()
    All epochs sent at once to ensure smooth interaction when changing epochs.
    """

    if not layername:
        return 404

    layername = re.sub(r"__", "/", layername, 0)

    attributes = _get_metadata()
    files = attributes['files']
    epochnr = len(files)

    # Combine all the data
    weights = None
    for i, f_name in enumerate(files):
        file = h5py.File(f_name, "r")
        data = file.get(layername)
        if weights is None:
            weights = np.zeros((epochnr,) + data.shape)
        weights[i, ...] = data[:]

    # Return as json
    return rapidjson.dumps(weights.flatten().tolist())

if __name__ == '__main__':
    app.run(debug=True)

