from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/device")
def device():
    return render_template("device.html")

@app.route("/tutorial")
def tutorial():
    return render_template("tutorial.html")

@app.route("/simulator")
def simulator():
    return render_template("simulator.html")

if __name__ == "__main__":
    app.run(debug=True)
