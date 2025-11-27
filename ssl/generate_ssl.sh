#!/bin/bash

mkdir -p ./ssl

mkdir -p ./backend/01_reverse_proxy/ssl
mkdir -p ./frontend/ssl

if [ ! -f ./backend/01_reverse_proxy/ssl/proxy.crt ] \
    || [ ! -f ./backend/01_reverse_proxy/ssl/proxy.key ] \
    || [ ! -f ./frontend/ssl/proxy.crt ] \
    || [ ! -f ./frontend/ssl/proxy.key ]; then

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -out ./ssl/proxy.crt \
        -keyout ./ssl/proxy.key \
        -subj "/C=FR/ST=NA/L=Angouleme/O=42/OU=42/CN=locharve.42.fr/UID=locharve"

    cp ./ssl/proxy.crt ./ssl/proxy.key ./backend/01_reverse_proxy/ssl/
    cp ./ssl/proxy.crt ./ssl/proxy.key ./frontend/ssl/
fi