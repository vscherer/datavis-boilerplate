
# TensorVis: A Tool for Visual Analytis Tensors

This is a Python-based web-application, intended to be used locally
for data visualisation.

**Why a Python backend?**
Because the most popular libraries for data manipulation are
made for Python. With a Python backend you can use your favorite data-analysis libraries, like [Numpy](http://www.numpy.org/), [scikit-learn](http://scikit-learn.org/stable/) and [Pandas](http://pandas.pydata.org/), to elaborate the data before visualising it.

 **Why a Javascript frontend?** Because visualizing stuff using Python is always a pain and creating dynamic, interactive interfaces is almost impossible. With a Javascript frontend you can use your favorite library for data visualization such as [D3.js](https://d3js.org/) or [Plotly.js](https://plot.ly/javascript/).

 This is the approach that [Google's Tensorboard](https://www.tensorflow.org/get_started/summaries_and_tensorboard) also adopts. The main challenge here is how to move data from Python to Javascript. We use [Flask](http://flask.pocoo.org/) as web-server and transfer data via HTTP using Panda's serialization utilities.

## How to start
- Install backend (Python) dependencies
```
pip install -r requirements.txt
```

- Install frontend (JS) dependencies. First make sure [npm](https://www.npmjs.com/get-npm) is available on your system, the run:
```
npm install -g webpack
npm install
```

- Run (replace ./demo/data with your data directory of choice)
```
webpack && python3 app.py --log_dir=./demo/data/
```
Navigate with your browser to `http://0.0.0.0:5000` to see the app in action.

Notice that this will run `python app.py` and `webpack --watch` *in parallel*.
You can also run the two commands above manually in two separate tabs.

## How to install additional dependencies
- For Python dependencies use
```
pip install [package-name]
```

- For Javascript dependencies use
```
npm install --save [package-name]
```
## License
MIT
