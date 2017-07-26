'''Example program from the Keras examples directory.
Exports the weights for use with the visualization app.
'''

from __future__ import print_function

import keras
from keras.datasets import mnist
from keras.models import Sequential
from keras.layers import Dense, Dropout, Conv2D, Flatten, Activation, MaxPooling2D
from keras.optimizers import RMSprop
from keras.callbacks import ModelCheckpoint
import os
import errno


def make_log_dir(path):
    try:
        os.makedirs(path)
        print("Created folder " + path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
    return

batch_size = 128
num_classes = 10
epochs = 10

# The location of this script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Where to export the weights to
log_dir = script_dir + "/data/mnist_cnn/"

# the data, shuffled and split between train and test sets
(x_train, y_train), (x_test, y_test) = mnist.load_data()

x_train = x_train.reshape(60000, 28, 28, 1)
x_test = x_test.reshape(10000, 28, 28, 1)
x_train = x_train.astype('float32')
x_test = x_test.astype('float32')
x_train /= 255
x_test /= 255
print(x_train.shape[0], 'train samples')
print(x_test.shape[0], 'test samples')

# convert class vectors to binary class matrices
y_train = keras.utils.to_categorical(y_train, num_classes)
y_test = keras.utils.to_categorical(y_test, num_classes)

model = Sequential()
model.add(Conv2D(32, (3, 3), input_shape=(28,28,1), use_bias=True, activation='relu'))
model.add(Conv2D(64, (3, 3), use_bias=True, activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Flatten())
model.add(Dense(128, activation='relu', use_bias=True))
model.add(Dense(num_classes, use_bias=True))
model.add(Activation('softmax'))
model.summary()
model.compile(loss=keras.losses.categorical_crossentropy,
              optimizer='adam',
              metrics=['accuracy'])

#Make sure log_dir exists
make_log_dir(log_dir)

# Saves the weights to desired path
checkpointer = ModelCheckpoint(filepath=
    log_dir + "weights{epoch:02d}.hdf5", verbose=1,
    save_best_only=False, save_weights_only=True)

history = model.fit(x_train, y_train,
                    batch_size=batch_size,
                    epochs=epochs,
                    verbose=1,
                    validation_data=(x_test, y_test),
                    callbacks=[checkpointer])
score = model.evaluate(x_test, y_test, verbose=0)
print('Test loss:', score[0])
print('Test accuracy:', score[1])
