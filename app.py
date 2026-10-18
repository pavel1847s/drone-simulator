from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

# ===== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ =====
def init_db():
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS game_stats
                 (id INTEGER PRIMARY KEY, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)''')
    # Создаем строку со статистикой, если ее еще нет
    c.execute('INSERT OR IGNORE INTO game_stats (id, wins, losses) VALUES (1, 0, 0)')
    conn.commit()
    conn.close()

init_db()

# ===== МАРШРУТЫ САЙТА =====
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

@app.route("/search")
def search():
    return render_template("search.html")

# ===== API ДЛЯ СТАТИСТИКИ =====
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    c.execute('SELECT wins, losses FROM game_stats WHERE id=1')
    result = c.fetchone()
    conn.close()
    return jsonify({'wins': result[0], 'losses': result[1]})

@app.route('/api/update_stats', methods=['POST'])
def update_stats():
    data = request.get_json()
    result_type = data.get('result')
    
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    if result_type == 'win':
        c.execute('UPDATE game_stats SET wins = wins + 1 WHERE id=1')
    elif result_type == 'loss':
        c.execute('UPDATE game_stats SET losses = losses + 1 WHERE id=1')
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

if __name__ == "__main__":
    app.run(debug=True)
