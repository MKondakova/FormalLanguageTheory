#!/usr/bin/env bash

for i in $2; do
	echo '---->' $i
	cat $i
	echo '----' 
	node $1 $i
done