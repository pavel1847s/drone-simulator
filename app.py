from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__)
app.secret_key = 'твой_секретный_ключ_123'

# ===== БАЗА ДАННЫХ =====
def init_db():
    conn = sqlite3.connect('stats.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS game_stats (id INTEGER PRIMARY KEY, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)''')
    c.execute('INSERT OR IGNORE INTO game_stats (id, wins, losses) VALUES (1, 0, 0)')
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  username TEXT UNIQUE, 
                  email TEXT UNIQUE, 
                  password_hash TEXT)''')
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect('stats.db')
    conn.row_factory = sqlite3.Row
    return conn

# ===== МАРШРУТЫ =====
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

# ===== АККАУНТЫ =====
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        conn = get_db()
        try:
            conn.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                         (username, email, generate_password_hash(password)))
            conn.commit()
            flash('Регистрация успешна! Теперь войдите.', 'success')
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            flash('Этот логин или почта уже заняты.', 'error')
        finally:
            conn.close()
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('index'))
        else:
            flash('Неверная почта или пароль.', 'error')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# ===== API СТАТИСТИКИ =====
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    result = conn.execute('SELECT wins, losses FROM game_stats WHERE id=1').fetchone()
    conn.close()
    return jsonify({'wins': result['wins'], 'losses': result['losses']})

@app.route('/api/update_stats', methods=['POST'])
def update_stats():
    data = request.get_json()
    result_type = data.get('result')
    conn = get_db()
    if result_type == 'win':
        conn.execute('UPDATE game_stats SET wins = wins + 1 WHERE id=1')
    elif result_type == 'loss':
        conn.execute('UPDATE game_stats SET losses = losses + 1 WHERE id=1')
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

if __name__ == "__main__":
    app.run(debug=True)
