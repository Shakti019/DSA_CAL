# 🧠 DSA-Powered Smart Expression Calculator

## Project Overview
An advanced, interactive calculator web app that solves mathematical expressions, explains each step, and visualizes DSA concepts (stack, tree, recursion). Calculation history is stored in the browser (localStorage). No authentication or database required.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Flask (Python)
- **Storage:** Browser localStorage
- **Optional:** Chart.js for graph/tree visualization

## Features
- Smart expression input (parentheses, decimals, negatives)
- Infix to postfix conversion (stack-based)
- Postfix evaluation with step-by-step stack operations
- Expression tree visualization (optional)
- Calculation history (localStorage, last 10–20 calculations)
- Error detection (syntax, divide-by-zero)
- Light/Dark theme toggle
- Scientific functions (sin, cos, log, sqrt, etc.)
- Graph plotting (optional)

## File Structure
```
smart-calculator/
├── templates/
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/script.js
├── app.py
├── utils/
│   ├── parser.py
│   └── evaluator.py
├── README.md
└── requirements.txt
```

## Usage
1. Run the Flask backend: `python app.py`
2. Open the app in your browser.
3. Enter expressions, view step-by-step solutions, and see your calculation history.

---

**This project is designed for learning, DSA demonstration, and easy extension.** 