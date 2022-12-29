run-debug:
	flask --debug run
run-demo:
	gunicorn3 -e SCRIPT_NAME=/hackaday/spring --bind 0.0.0.0:8036 app:app
