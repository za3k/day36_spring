import flask, flask_login
import hashlib, functools, random, string
from sqlitedict import SqliteDict
from flaskext.markdown import Markdown

app = flask.Flask(__name__)
Markdown(app)

app.secret_key = "quadruped effulgence fates cutaway monophonic" # Hack-a-day! Check it in to source.
login_manager = flask_login.LoginManager()
login_manager.init_app(app)

db_lists = set()
db_dicts = set()
def DBDict(project, name, is_list=False, debug=False):
    if not (is_list or debug):
        global dicts
        db_dicts.add(name)
    return SqliteDict("{}.sqlite".format(project),tablename=name,autocommit=True)
class DBList():
    def __init__(self, project, name, debug=False):
        if not debug:
            global db_lists
            db_lists.add(name)
        self.d = DBDict(project, name, is_list=True)
        if "order" not in self.d:
            self.d["order"] = []
    def append(self, x):
        import time
        key = str(int(time.time())) # Good enough for hack-a-day
        self.d[key] = x
        self.d["order"] = self.d["order"] + [key]
    def __len__(self):
        return len(self.d["order"])
    def __getitem__(self, key):
        key = self.d["order"][key]
        return self.d[key]
    def __setitem__(self, key, value):
        key = self.d["order"][key]
        self.d[key] = value
    def __iter__(self):
        return (self.d[key] for key in self.d["order"])
    def __reversed__(self):
        return (self.d[key] for key in reversed(self.d["order"]))
    
class User(flask_login.UserMixin):
    def get(username, password=None):
        users = DBDict("users", "users")
        if username == '' or username not in users:
            return
        if password is not None and users[username]['password'] != password:
            return
        user = User()
        user.id = username
        return user
    def register(username, password):
        users = DBDict("users", "users")
        if username in users:
            if password == users[username]['password']:
                return user
            return None
        users[username]={'password': password}
        return User.get(username, password)

@login_manager.user_loader
def user_loader(username): # Load user from a session
    return User.get(username)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if flask.request.method == "GET":
        redirect = flask.request.args.get('redirect', flask.url_for("index"))
        return flask.render_template('login.html', redirect=redirect)
    username = flask.request.form['username']
    password = flask.request.form['password']
    user = User.get(username, password)
    if not user: # Hack-a-day! Combine registration and login
        user = User.register(username, password)
    if user:
        flask_login.login_user(user, remember=True)
        then = flask.request.form.get('redirect', flask.url_for("index"))
        # Hack-a-day! No safety here.
        #if not is_safe_url(then):
        #    return flask.abort(400)
        return flask.redirect(then)

    return 'Bad login'

@app.route("/login.js")
def login_js():
    response = ""
    if app.info["login"]:
        response += "window.loggedIn = {};\n".format(0+flask_login.current_user.is_authenticated)
        response += "window.userId = \"{}\";\n".format(flask_login.current_user.id if flask_login.current_user.is_authenticated else "")
    response += "window.ajaxPrefix = window.wsPrefix = \"{}\";\n".format(app.info["subdir"])
    return response

@app.route('/logout')
def logout():
    flask_login.logout_user()
    redirect = flask.request.args.get('redirect', flask.url_for("index"))
    return flask.redirect(redirect)

@login_manager.unauthorized_handler
def unauthorized_handler():
    return 'Unauthorized', 401

@app.route("/dump")
def dump():
    if not app.config["DEBUG"]:
        return "Disabled in production", 404
    global db_lists, db_dicts
    s = "<pre>"
    s+="DICTS = {}\n".format(repr(sorted(db_dicts)))
    s+="LISTS = {}\n\n".format(repr(sorted(db_lists)))
    for d in sorted(db_dicts):
        db = DBDict(d, debug=True)
        s+="{}={{\n{}\n}}\n".format(d, "\n".join("  {}: {}".format(repr(k),repr(v)) for k,v in db.items()))
    s += "\n\n"
    for l in db_lists:
        db = DBList(l, debug=True)
        s+="{}=[\n{}\n]\n".format(l, "\n".join("  {}".format(repr(v)) for v in db))
        #db = DBDict(l, debug=True)
        #s+="{}={{\n{}\n}}\n".format(l, "\n".join("  {}: {}".format(repr(k),repr(v)) for k,v in db.items()))
    s+="</pre>"
    return s

info={}
def load_info(new_info):
    global info
    info=new_info
    if app.config["DEBUG"]:
        info["subdir"]=""
    else:
        app.config["APPLICATION_ROOT"]=info["subdir"]
    app.config["REMEMBER_COOKIE_NAME"]="remember_token {}".format(info.get("subdir", "default"))
    app.info = info
    return info["project"]
def full_url_for(*args,**kw):
    short = flask.url_for(*args, **kw)
    if app.config["DEBUG"]:
        base = "http://localhost:5000"
    else:
        base = "https://tilde.za3k.com"
    return base + short
@app.context_processor
def inject_dict_for_all_templates():
    return app.info

@app.route("/about")
def about():
    with open("README.md", "r") as f:
        readme = f.read()
    return flask.render_template('about.html', content=readme)

def ajax(route):
    def x(f, r=route):
        @functools.wraps(f)
        def f2(*a, **kw):
            if not flask.request.is_json:
                return "Invalid JSON", 400
            query = flask.request.get_json()
            return f(query, *a, **kw)
        print(r)
        return app.route(r, methods=["POST"])(app.route(app.info["subdir"]+r, methods=["POST"])(f2))
    return x
app.ajax = ajax

@app.route("/favicon.ico")
def favicon():
    return "",404

def random_id():
    LETTERS=string.ascii_letters + string.digits
    return "".join(random.choice(LETTERS) for letter in range(10))
def hash_id(data):
    if isinstance(data, str): data = data.encode("utf8")
    return hashlib.sha256(data).hexdigest()
