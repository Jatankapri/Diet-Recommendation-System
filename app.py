from flask import Flask, render_template, request,jsonify, redirect, url_for, flash, session
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
from tensorflow.keras.models import load_model

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'

# Load dataset
try:
    dataset = pd.read_csv("Dataset.csv")
    if "DietType" not in dataset.columns:
        raise KeyError("'DietType' column missing in Dataset.csv")
except (FileNotFoundError, KeyError) as e:
    print(f"Error: {e}")
    dataset = pd.DataFrame()

# Load pre-trained model
try:
    model = load_model("diet_recommender_model.h5")
except FileNotFoundError:
    print("Error: diet_recommender_model.h5 not found. Ensure it is in the correct directory.")
    model = None  # Initialize model to None to prevent further errors


# Initialize the database
def init_db():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            age INTEGER NOT NULL,
                            gender TEXT NOT NULL,
                            username TEXT UNIQUE NOT NULL,
                            email TEXT UNIQUE NOT NULL,
                            password_hash TEXT NOT NULL)''')
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS meal_selections (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            Name TEXT NOT NULL,
                            Calories FLOAT NOT NULL,
                            RecipeIngredientParts TEXT,
                            meal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)''')
        conn.commit()

# Home route (redirects to login page)
@app.route('/')
def home():
    return redirect(url_for('login'))

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            if user and check_password_hash(user[1], password):
                session['user_id'] = user[0]
                session.pop('stay_logged_out', None)  # Clear stay_logged_out if logged in
                flash('Login successful!', 'success')
                return redirect(url_for('index'))
            else:
                flash('Invalid username or password', 'danger')
    return render_template('login.html')

# Signup route
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form['name']
        age = request.form['age']
        gender = request.form['gender']
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        # Check if passwords match
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('signup'))
        
        # Hash the password
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        # Check if username or email already exists
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username, email))
            existing_user = cursor.fetchone()
            
            if existing_user:
                flash('Username or email already exists', 'danger')
                return redirect(url_for('signup'))

            # If no user exists, insert the new user
            cursor.execute("INSERT INTO users (name, age, gender, username, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)", 
                           (name, age, gender, username, email, hashed_password))
            conn.commit()
            flash('Signup successful! Please login.', 'success')
            return redirect(url_for('login'))
    
    return render_template('signup.html')

# index route
@app.route('/index')
def index():
    if 'user_id' not in session and not session.get('stay_logged_out', False):
        flash('Please log in first.', 'warning')
        return redirect(url_for('login'))
    return render_template('index.html')

# Stay Logged Out route
@app.route('/stay_logged_out')
def stay_logged_out():
    session['stay_logged_out'] = True
    session.pop('user_id', None)  # Clear user_id session
    flash('You are now logged out. You can browse but cannot save data.', 'info')
    return redirect(url_for('index'))  # Or any other page where you want the message


# Logout route
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('stay_logged_out', None)  # Clear stay_logged_out flag
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

# Activity level multipliers (defined outside the function for efficiency)
ACTIVITY_LEVELS = {
    "sedentary": 1.2,
    "moderate": 1.55,
    "active": 1.725
}

# Generate Meal Plan (Users can access without logging in)
@app.route("/predict", methods=["POST"])
def predict():
    """Generates a meal plan based on user input (weight, height, age, gender, activity level)."""
    data = request.json

    # Input validation
    weight = data.get("weight")
    height = data.get("height")
    age = data.get("age")
    gender = data.get("gender")
    activity = data.get("activity")
    diet_type = data.get("diet")

    if not isinstance(weight, (int, float)):
        return jsonify({"error": "Invalid or missing weight value"}), 400
    if not isinstance(height, (int, float)):
        return jsonify({"error": "Invalid or missing height value"}), 400
    if not isinstance(age, int):
        return jsonify({"error": "Invalid or missing age value"}), 400
    if gender not in ["male", "female"]:
        return jsonify({"error": "Invalid or missing gender value"}), 400
    if not activity:
        return jsonify({"error": "Invalid or missing activity level"}), 400

    # Calculate BMR
    if gender == "male":
        bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    else:
        bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age

    # Adjust BMR based on activity level
    activity_multiplier = ACTIVITY_LEVELS.get(activity.lower(), 1.2)
    daily_calories = int(bmr * activity_multiplier)

    # Meal distribution
    meal_distribution = [30, 40, 30]
    meal_names = ["Breakfast", "Lunch", "Dinner"]
    meal_calories = [(daily_calories * percentage) // 100 for percentage in meal_distribution]

    diet_plan = {}
    for meal_name, calories in zip(meal_names, meal_calories):
        if diet_type == "vegetarian":
            filtered_recipes = dataset[(dataset["Calories"] >= calories - 50) & (dataset["Calories"] <= calories + 50) & (dataset["DietType"] == "Vegetarian")]
        elif diet_type == "non-vegetarian":
            filtered_recipes = dataset[(dataset["Calories"] >= calories - 50) & (dataset["Calories"] <= calories + 50) & (dataset["DietType"] == "Non-Vegetarian")]
        else:
            filtered_recipes = dataset[(dataset["Calories"] >= calories - 50) & (dataset["Calories"] <= calories + 50)]

        if not filtered_recipes.empty:
            # Select up to 5 random recipes
            random_recipes = filtered_recipes.sample(n=min(5, len(filtered_recipes)))
            # Extract relevant information
            diet_plan[meal_name] = random_recipes[["Name", "Calories",'FatContent', 'CarbohydrateContent', 'FiberContent', 'SugarContent', 'ProteinContent', "RecipeIngredientParts", "RecipeInstructions", "Images"]].to_dict(orient="records")
        else:
            diet_plan[meal_name] = ["No suitable recipe found"]

    return jsonify({"bmrActivityResult": daily_calories, "recommendations": diet_plan})

# Save Selection route
@app.route('/save_meal', methods=['POST'])
def save_meal():
    if 'user_id' not in session:
        flash('Please log in first.', 'warning')
        return redirect(url_for('login'))
    
    # Retrieve data from the form submission
    user_id = session['user_id']
    name = request.form['name']
    calories = float(request.form['calories'])  # Ensure it's treated as a float
    recipe_ingredients = request.form['recipe_ingredients']
    
    # Save the meal selection into the database
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO meal_selections (user_id, Name, Calories, RecipeIngredientParts)
                          VALUES (?, ?, ?, ?)''', 
                       (user_id, name, calories, recipe_ingredients))
        conn.commit()
    
    flash('Meal selection saved successfully!', 'success')
    return redirect(url_for('index'))  # Redirect to index or wherever you want

# View Saved Meals route
@app.route('/saved_meals')
def saved_meals():
    if 'user_id' not in session:
        flash('Please log in first.', 'warning')
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    
    # Retrieve meals from the database
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''SELECT Name, Calories, RecipeIngredientParts, meal_date 
                          FROM meal_selections 
                          WHERE user_id = ? 
                          ORDER BY meal_date DESC''', (user_id,))
        meals = cursor.fetchall()

    return render_template('index.html', meals=meals)

@app.route('/saved_meals')
def saved_meals_page():
    return render_template('saved_meals.html')


if __name__ == '__main__':
    init_db()
    app.run(debug=True)
