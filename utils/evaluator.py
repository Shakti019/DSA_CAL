import math
import re

# Variable storage (in-memory for now)
variables = {}
__all__ = ['evaluate_postfix', 'get_variables', 'get_evaluation_steps', 'variables']

def parse_complex(token):
    # Accepts '2i', '-3.5i', '1i', 'i', etc.
    if token.endswith('i'):
        val = token[:-1]
        if val == '' or val == '+':
            return complex(0, 1)
        elif val == '-':
            return complex(0, -1)
        else:
            return complex(0, float(val))
    return None

def evaluate_postfix(postfix, assign_var=None):
    stack = []
    for token in postfix:
        if token.endswith('i'):
            stack.append(parse_complex(token))
        elif re.match(r'\d+\.\d+|\d+', token):
            stack.append(float(token))
        elif re.match(r'^[a-zA-Z]$', token):
            # Variable usage
            if token in variables:
                stack.append(variables[token])
            else:
                raise ValueError(f"Variable '{token}' not defined")
        elif token == 'pi':
            stack.append(math.pi)
        elif token == 'e':
            stack.append(math.e)
        elif token in {'+', '-', '*', '/', '^', '**'}:
            b = stack.pop()
            a = stack.pop()
            if token in {'^', '**'}:
                stack.append(a ** b)
            elif token == '+':
                stack.append(a + b)
            elif token == '-':
                stack.append(a - b)
            elif token == '*':
                stack.append(a * b)
            elif token == '/':
                if b == 0:
                    raise ValueError('Division by zero')
                stack.append(a / b)
        elif token in {'mod', 'abs'}:
            a = stack.pop()
            stack.append(abs(a))
        elif token == 'conj':
            a = stack.pop()
            stack.append(a.conjugate() if hasattr(a, 'conjugate') else a)
        elif token in {'sin', 'cos', 'tan', 'log', 'log10', 'sqrt', 'exp', 'asin', 'acos', 'atan'}:
            a = stack.pop()
            if token == 'sin':
                stack.append(math.sin(a))
            elif token == 'cos':
                stack.append(math.cos(a))
            elif token == 'tan':
                stack.append(math.tan(a))
            elif token == 'log':
                if a <= 0:
                    raise ValueError('Logarithm domain error')
                stack.append(math.log(a))
            elif token == 'log10':
                if a <= 0:
                    raise ValueError('Logarithm domain error')
                stack.append(math.log10(a))
            elif token == 'sqrt':
                if a < 0:
                    stack.append(complex(0, math.sqrt(-a)))
                else:
                    stack.append(math.sqrt(a))
            elif token == 'exp':
                stack.append(math.exp(a))
            elif token == 'asin':
                stack.append(math.asin(a))
            elif token == 'acos':
                stack.append(math.acos(a))
            elif token == 'atan':
                stack.append(math.atan(a))
        elif token == 'neg':
            a = stack.pop()
            stack.append(-a)
        else:
            raise ValueError(f'Unknown token in evaluation: {token}')
    if len(stack) != 1:
        raise ValueError('Invalid expression for evaluation')
    result = stack[0]
    # Assignment: store variable if needed
    if assign_var:
        variables[assign_var] = result
        return result, assign_var
    return result, None

def get_variables():
    return variables.copy()

def get_evaluation_steps(postfix):
    stack = []
    steps = []
    for token in postfix:
        if token.endswith('i'):
            val = parse_complex(token)
            stack.append(val)
            steps.append(f"{token} = {val}")
        elif token.replace('.', '', 1).isdigit():
            stack.append(float(token))
            steps.append(f"{token}")
        elif re.match(r'^[a-zA-Z]$', token):
            # Variable usage
            if token in variables:
                stack.append(variables[token])
                steps.append(f"{token} = {variables[token]}")
            else:
                raise ValueError(f"Variable '{token}' not defined")
        elif token == 'pi':
            stack.append(math.pi)
            steps.append("pi")
        elif token == 'e':
            stack.append(math.e)
            steps.append("e")
        elif token in {'+', '-', '*', '/', '^', '**'}:
            b = stack.pop()
            a = stack.pop()
            if token == '+':
                res = a + b
                steps.append(f"{a} + {b} = {res}")
            elif token == '-':
                res = a - b
                steps.append(f"{a} - {b} = {res}")
            elif token == '*':
                res = a * b
                steps.append(f"{a} * {b} = {res}")
            elif token == '/':
                res = a / b
                steps.append(f"{a} / {b} = {res}")
            elif token in {'^', '**'}:
                res = a ** b
                steps.append(f"{a} ^ {b} = {res}")
            stack.append(res)
        elif token in {'mod', 'abs'}:
            a = stack.pop()
            res = abs(a)
            steps.append(f"|{a}| = {res}")
            stack.append(res)
        elif token == 'conj':
            a = stack.pop()
            res = a.conjugate() if hasattr(a, 'conjugate') else a
            steps.append(f"conj({a}) = {res}")
            stack.append(res)
        elif token in {'sin', 'cos', 'tan', 'log', 'log10', 'sqrt', 'exp', 'asin', 'acos', 'atan'}:
            a = stack.pop()
            if token == 'sin':
                res = math.sin(a)
                steps.append(f"sin({a}) = {res}")
            elif token == 'cos':
                res = math.cos(a)
                steps.append(f"cos({a}) = {res}")
            elif token == 'tan':
                res = math.tan(a)
                steps.append(f"tan({a}) = {res}")
            elif token == 'log':
                res = math.log(a)
                steps.append(f"log({a}) = {res}")
            elif token == 'log10':
                res = math.log10(a)
                steps.append(f"log10({a}) = {res}")
            elif token == 'sqrt':
                if a < 0:
                    res = complex(0, math.sqrt(-a))
                else:
                    res = math.sqrt(a)
                steps.append(f"sqrt({a}) = {res}")
            elif token == 'exp':
                res = math.exp(a)
                steps.append(f"exp({a}) = {res}")
            elif token == 'asin':
                res = math.asin(a)
                steps.append(f"asin({a}) = {res}")
            elif token == 'acos':
                res = math.acos(a)
                steps.append(f"acos({a}) = {res}")
            elif token == 'atan':
                res = math.atan(a)
                steps.append(f"atan({a}) = {res}")
            stack.append(res)
        elif token == 'neg':
            a = stack.pop()
            res = -a
            steps.append(f"neg({a}) = {res}")
            stack.append(res)
    return steps 