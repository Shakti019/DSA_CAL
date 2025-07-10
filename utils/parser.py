import re

# Operator precedence and associativity
precedence = {
    '+': 1, '-': 1,
    '*': 2, '/': 2,
    '^': 3, '**': 3,
    'sin': 4, 'cos': 4, 'tan': 4, 'log': 4, 'log10': 4, 'sqrt': 4,
    'exp': 4, 'abs': 4, 'asin': 4, 'acos': 4, 'atan': 4,
    'neg': 5  # unary minus
}
right_associative = {'^', '**', 'neg'}

# Tokenizer: splits input into numbers, operators, parentheses, functions, constants, variables, assignment
# Improved: negative numbers as single token if after '(' or at start

def tokenize(expr):
    expr = expr.replace(' ', '')
    expr = expr.replace('**', '^')  # treat ** as ^ for now
    tokens = []
    i = 0
    while i < len(expr):
        # Assignment
        if expr[i] == '=' and (i == 0 or expr[i-1] not in '=<>!'):
            tokens.append('=')
            i += 1
        # Complex number literal (e.g., 2i, -3.5i)
        elif (expr[i] == '-' and (
            (i == 0) or (expr[i-1] in '(*^/+-')
        ) and (i+1 < len(expr) and (expr[i+1].isdigit() or expr[i+1] == '.'))):
            num = '-'
            i += 1
            while i < len(expr) and (expr[i].isdigit() or expr[i] == '.'):
                num += expr[i]
                i += 1
            # Check for 'i' after number
            if i < len(expr) and expr[i] == 'i':
                num += 'i'
                i += 1
            tokens.append(num)
        elif expr[i].isdigit() or (expr[i] == '.' and i+1 < len(expr) and expr[i+1].isdigit()):
            num = expr[i]
            i += 1
            while i < len(expr) and (expr[i].isdigit() or expr[i] == '.'):
                num += expr[i]
                i += 1
            # Check for 'i' after number
            if i < len(expr) and expr[i] == 'i':
                num += 'i'
                i += 1
            tokens.append(num)
        elif expr[i] == 'i':
            tokens.append('1i')
            i += 1
        elif expr[i:i+5] == 'log10':
            tokens.append('log10')
            i += 5
        elif expr[i:i+3] in {'sin', 'cos', 'tan', 'log', 'exp', 'abs'}:
            tokens.append(expr[i:i+3])
            i += 3
        elif expr[i:i+4] in {'sqrt', 'asin', 'acos', 'atan'}:
            tokens.append(expr[i:i+4])
            i += 4
        elif expr[i] in '+-*/^()':
            # True unary minus (not negative literal)
            if expr[i] == '-' and (i == 0 or expr[i-1] in '(*^/+-'):
                tokens.append('neg')
            else:
                tokens.append(expr[i])
            i += 1
        elif expr[i:i+2] == '**':
            tokens.append('**')
            i += 2
        elif expr[i:i+2] == 'pi':
            tokens.append('pi')
            i += 2
        elif expr[i] == 'e':
            tokens.append('e')
            i += 1
        elif re.match(r'[a-zA-Z]', expr[i]):  # variable support
            tokens.append(expr[i])
            i += 1
        else:
            raise ValueError(f'Unknown token: {expr[i:]}')
    return tokens

# Infix to Postfix conversion (Shunting Yard Algorithm)
def infix_to_postfix(tokens):
    # Assignment support: a = expr
    if '=' in tokens:
        eq_idx = tokens.index('=')
        if eq_idx != 1 or not re.match(r'^[a-zA-Z]$', tokens[0]):
            raise ValueError('Assignment must be of the form: variable = expression')
        var = tokens[0]
        expr_tokens = tokens[2:]
        postfix = _infix_to_postfix(expr_tokens)
        return postfix, var
    else:
        return _infix_to_postfix(tokens), None

def _infix_to_postfix(tokens):
    output = []
    stack = []
    for token in tokens:
        if re.match(r'\d+\.\d+|\d+', token) or re.match(r'[a-zA-Z]', token):
            output.append(token)
        elif token in precedence:
            while (stack and stack[-1] != '(' and
                   ((precedence.get(stack[-1], 0) > precedence[token]) or
                    (precedence.get(stack[-1], 0) == precedence[token] and token not in right_associative))):
                output.append(stack.pop())
            stack.append(token)
        elif token == '(': 
            stack.append(token)
        elif token == ')':
            found_paren = False
            while stack:
                top = stack.pop()
                if top == '(': 
                    found_paren = True
                    break
                output.append(top)
            if not found_paren:
                raise ValueError('Mismatched parentheses')
        else:
            raise ValueError(f'Unknown token: {token}')
    while stack:
        if stack[-1] in '()':
            raise ValueError('Mismatched parentheses')
        output.append(stack.pop())
    return output

# TreeNode class for expression tree
class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

    def to_dict(self):
        node = {'value': self.value}
        if self.left:
            node['left'] = self.left.to_dict()
        if self.right:
            node['right'] = self.right.to_dict()
        return node

# Build expression tree from postfix tokens
def build_expression_tree(postfix):
    stack = []
    for token in postfix:
        if re.match(r'\d+\.\d+|\d+', token) or re.match(r'[a-zA-Z]', token):
            stack.append(TreeNode(token))
        elif token in {'+', '-', '*', '/', '^', '**'}:
            right = stack.pop()
            left = stack.pop()
            stack.append(TreeNode(token, left, right))
        elif token in {'sin', 'cos', 'tan', 'log', 'log10', 'sqrt', 'exp', 'abs', 'asin', 'acos', 'atan', 'neg'}:
            child = stack.pop()
            stack.append(TreeNode(token, child))
        else:
            raise ValueError(f'Unknown token in tree: {token}')
    if len(stack) != 1:
        raise ValueError('Invalid expression for tree')
    return stack[0].to_dict() 