#!/bin/bash

FQDN=localhost:3000

if [[ $1 == "" ]]; then
    echo nothing done
    exit 0
fi

if [[ $1 == "root" ]]; then
    for i in $(seq 1 10); do
        curl -w "\n" $FQDN/?msg=hi&there=hello
        sleep 0.1
    done
fi

if [[ $1 == "health" ]]; then
    curl -w "\n" $FQDN/health
fi
