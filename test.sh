#!/bin/sh

FQDN=localhost:3000

if [[ $1 == "" ]]; then
    echo nothing done
    exit 0
fi

if [[ $1 == "root" ]]; then
    for i in $(seq 1 10); do
        curl $FQDN/?msg=hi&there=hello
    done
    exit 0
fi

if [[ $1 == "health" ]]; then
    curl $FQDN/health
    exit 0
fi
