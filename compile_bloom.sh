#!/usr/bin/env bash

if [ $# -eq 2 ]
then
  node bloom_compiler/compile.js $1 > $2
elif [[ $# -eq 3 ]] && [[ $1 == --sql ]]
then
  node bloom_compiler/compile.js $2 sql > $3
else
  echo "Usage: ./compile_bloom [ INPUT_FILE ] [ OUTPUT_FILE ]"
  echo "Options: --sql"
fi

