#!/bin/python3
from flask import url_for, request, render_template, redirect
from flask_login import current_user
from base import app,load_info,ajax,DBDict,DBList,random_id,hash_id,full_url_for

# -- Info for every Hack-A-Day project --
project = load_info({
    "project_name": "Hack-A-Spring",
    "project": "spring",
    "source_url": "https://github.com/za3k/day36_spring",
    "subdir": "/hackaday/spring",
    "description": "Click to drag",
    "instructions": "",
    "login": False,
    "fullscreen": True,
})

# -- Routes specific to this Hack-A-Day project --
@app.route("/")
def index():
    return render_template('index.html')
