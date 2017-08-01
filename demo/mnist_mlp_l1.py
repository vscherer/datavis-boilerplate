'''Example program from the Keras examples directory.
Exports the weights for use with the visualization app.
'''

from __future__ import print_function

import keras
from keras.datasets import mnist
from keras.models import Sequential
from keras.layers import Dense, Dropout
from keras.optimizers import RMSprop
from keras.regularizers import l1
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
epochs = 20

# The location of this script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Where to export the weights to
log_dir = script_dir + "/data/mnist_mlp_l1/"

# the data, shuffled and split between train and test sets
(x_train, y_train), (x_test, y_test) = mnist.load_data()

x_train = x_train.reshape(60000, 784)
x_test = x_test.reshape(10000, 784)
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
model.add(Dense(512, kernel_regularizer=l1(0.0005), activation='relu', input_shape=(784,)))
model.add(Dropout(0.2))
model.add(Dense(512, kernel_regularizer=l1(0.0005), activation='relu'))
model.add(Dropout(0.2))
model.add(Dense(10, kernel_regularizer=l1(0.0005), activation='softmax'))

model.summary()

model.compile(loss='categorical_crossentropy',
              optimizer=RMSprop(),
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
