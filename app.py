from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import utils.parser as parser
import utils.evaluator as evaluator
import numpy as np
from sympy import symbols, Eq, solve, sympify
import re

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json()
    expr = data.get('expression', '')
    try:
        tokens = parser.tokenize(expr)
        postfix, _ = parser.infix_to_postfix(tokens)
        steps = evaluator.get_evaluation_steps(postfix)
        result, _ = evaluator.evaluate_postfix(postfix)
        tree = parser.build_expression_tree(postfix)
        return jsonify({
            'result': result,
            'tokens': tokens,
            'postfix': postfix,
            'steps': steps,
            'tree': tree
        })
    except Exception as e:
        return jsonify({
            'result': 'Error',
            'tokens': [],
            'postfix': [],
            'steps': [str(e)],
            'tree': None
        })

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    expr = data.get('expression', '')
    try:
        tokens = parser.tokenize(expr)
        postfix, assign_var = parser.infix_to_postfix(tokens)
        result, assigned = evaluator.evaluate_postfix(postfix, assign_var)
        tree = parser.build_expression_tree(postfix)
        steps = evaluator.get_evaluation_steps(postfix)
        response = {
            'result': result,
            'steps': steps,
            'tree': tree,
            'assignment': assigned
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/variables', methods=['GET'])
def get_variables():
    return jsonify(evaluator.get_variables())

@app.route('/set_variable', methods=['POST'])
def set_variable():
    data = request.get_json()
    name = data.get('name', '').strip()
    value = data.get('value', '').strip()
    if not name or not value or not name.isalpha() or len(name) != 1:
        return jsonify({'success': False, 'error': 'Variable name must be a single letter.'})
    try:
        # Compose assignment expression and evaluate
        expr = f'{name} = {value}'
        tokens = parser.tokenize(expr)
        postfix, assign_var = parser.infix_to_postfix(tokens)
        result, assigned = evaluator.evaluate_postfix(postfix, assign_var)
        return jsonify({'success': True, 'result': result, 'assignment': assigned})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/delete_variable', methods=['POST'])
def delete_variable():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name or not name.isalpha() or len(name) != 1:
        return jsonify({'success': False, 'error': 'Variable name must be a single letter.'})
    try:
        # Remove from evaluator's variable dict
        vars_dict = evaluator.get_variables()
        if name in vars_dict:
            del vars_dict[name]
            # Overwrite the evaluator's variable dict
            evaluator.variables.clear()
            evaluator.variables.update(vars_dict)
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Variable not found.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/matrix', methods=['POST'])
def matrix_calc():
    data = request.get_json()
    op = data.get('op')
    A = np.array(data.get('A', []), dtype=float)
    B = np.array(data.get('B', []), dtype=float)
    try:
        if op == 'add':
            if A.shape != B.shape:
                return jsonify({'error': 'Matrix sizes must match for addition.'})
            result = (A + B).tolist()
        elif op == 'subtract':
            if A.shape != B.shape:
                return jsonify({'error': 'Matrix sizes must match for subtraction.'})
            result = (A - B).tolist()
        elif op == 'multiply':
            if A.shape[1] != B.shape[0]:
                return jsonify({'error': 'A columns must match B rows for multiplication.'})
            result = (A @ B).tolist()
        elif op == 'detA':
            if A.shape[0] != A.shape[1]:
                return jsonify({'error': 'A must be square for determinant.'})
            result = float(np.linalg.det(A))
        elif op == 'detB':
            if B.shape[0] != B.shape[1]:
                return jsonify({'error': 'B must be square for determinant.'})
            result = float(np.linalg.det(B))
        elif op == 'invA':
            if A.shape[0] != A.shape[1]:
                return jsonify({'error': 'A must be square for inverse.'})
            result = np.linalg.inv(A).tolist()
        elif op == 'invB':
            if B.shape[0] != B.shape[1]:
                return jsonify({'error': 'B must be square for inverse.'})
            result = np.linalg.inv(B).tolist()
        elif op == 'transA':
            result = A.T.tolist()
        elif op == 'transB':
            result = B.T.tolist()
        else:
            return jsonify({'error': 'Unknown operation.'})
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/complex', methods=['POST'])
def complex_calc():
    data = request.get_json()
    z1 = data.get('z1', '').replace(' ', '').replace('i', 'j')
    z2 = data.get('z2', '').replace(' ', '').replace('i', 'j')
    op = data.get('op')
    try:
        c1 = complex(z1) if z1 else 0
        c2 = complex(z2) if z2 else 0
        if op == 'add':
            res = c1 + c2
        elif op == 'subtract':
            res = c1 - c2
        elif op == 'multiply':
            res = c1 * c2
        elif op == 'divide':
            if c2 == 0:
                return jsonify({'error': 'Division by zero'})
            res = c1 / c2
        elif op == 'mod':
            res = abs(c1)
            return jsonify({'result': res})
        elif op == 'conj':
            res = c1.conjugate()
        else:
            return jsonify({'error': 'Unknown operation'})
        return jsonify({'result': {'re': res.real, 'im': res.imag}})
    except Exception as e:
        return jsonify({'error': str(e)})

def insert_mult(expr):
    # Insert * between number and variable (e.g., 2x -> 2*x)
    return re.sub(r'(\d)([a-zA-Z])', r'\1*\2', expr)

@app.route('/equation', methods=['POST'])
def equation_solver():
    data = request.get_json()
    eqn = data.get('eqn', '')
    variable = data.get('variable', '').strip()
    try:
        # Validate variable
        if variable and not re.fullmatch(r'[a-zA-Z]', variable):
            return jsonify({'error': 'Variable must be a single letter (e.g., x).'}), 400
        # Parse variable or auto-detect
        if variable:
            var = symbols(variable)
        else:
            m = re.search(r'([a-zA-Z])', eqn)
            if not m:
                return jsonify({'error': 'No variable found in equation.'})
            var = symbols(m.group(1))
        # Split equation at '='
        if '=' in eqn:
            left, right = eqn.split('=', 1)
        else:
            left, right = eqn, '0'
        left = insert_mult(left)
        right = insert_mult(right)
        left_expr = sympify(left)
        right_expr = sympify(right)
        equation = Eq(left_expr, right_expr)
        sol = solve(equation, var)
        steps = [f"Equation: {left_expr} = {right_expr}", f"Solve for {var}", f"Solution: {sol}"]
        return jsonify({'result': str(sol), 'steps': steps})
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port) 
