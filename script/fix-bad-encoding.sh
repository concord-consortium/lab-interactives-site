#!/bin/sh

# this requires passing the encoding of the file that is to be fixed
# like: fix-bad-encoding utf-16 my-bad-file.txt
iconv -f $1 -t utf-8 $2 > $2.utf-8
rm $2
mv $2.utf-8 $2
