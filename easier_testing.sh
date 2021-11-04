#!/usr/bin/env bash

for i in $2; do
	echo '---->' $i
	cat $i
	echo ' '
	echo '----' 
	node $1 $i
done