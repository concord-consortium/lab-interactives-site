#!/bin/sh
find src -type f -exec file --mime {} \; | grep -v -e "charset=us-ascii" -e "charset=binary" -e "charset=utf-8"