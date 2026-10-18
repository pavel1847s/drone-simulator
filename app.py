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
@app.route('/sitemap.xml')
def sitemap():
    xml = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://drone-simulator-ix4e.onrender.com/</loc></url>
      <url><loc>https://drone-simulator-ix4e.onrender.com/device</loc></url>
      <url><loc>https://drone-simulator-ix4e.onrender.com/tutorial</loc></url>
      <url><loc>https://drone-simulator-ix4e.onrender.com/simulator</loc></url>
    </urlset>"""
    return Response(xml, mimetype='application/xml')
if __name__ == "__main__":
    app.run(debug=True)
