from flask import Flask, render_template, jsonify
import numpy as np
import h5py
import os, glob, re
import rapidjson

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


def _get_metadata():
    # List parameter files
    files = sorted(glob.glob(log_dir + "weights*.hdf5"))
    attributes = {
        'epochs': len(files),
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
    return files, attributes

#####################################
# REST backend interface

@app.route('/meta')
def get_metadata():
    files, attributes = _get_metadata()
    return jsonify(attributes)

@app.route('/data/<string:layername>')
def get_data(layername):

    if not layername:
        return 404

    layername = re.sub(r"__", "/", layername, 0)

    files, attributes = _get_metadata()
    epochnr = len(files)

    # Combine all the data
    weights = None
    for i, f_name in enumerate(files):
        file = h5py.File(f_name, "r")
        data = file.get(layername)
        if weights is None:
            weights = np.zeros((epochnr,) + data.shape)
        weights[i, ...] = data[:]

    return rapidjson.dumps(weights.flatten().round(decimals=4).tolist())

if __name__ == '__main__':
    app.run(debug=True)

