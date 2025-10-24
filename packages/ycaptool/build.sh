#!/bin/bash

qmake6 ycaptool.pro && make && mkdir -p dist && cp ycaptool dist && rm ycaptool
