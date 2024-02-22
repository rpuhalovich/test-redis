#!/bin/sh

FQDN=localhost:3000

if [[ $1 == "" ]]; then
    echo nothing done
    exit 0
fi

if [[ $1 == "root" ]]; then
    for i in $(seq 1 5); do
        curl $FQDN/?msg=hi
    done
    exit 0
fi
