import re
import os

def update_sql_schema(filename='complete_schema.sql'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, filename)
    output_path = os.path.join(script_dir, filename.replace('.sql', '_updated.sql'))

    if not os.path.exists(input_path):
        print(f"Error: {filename} not found.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. TABLES: Add IF NOT EXISTS
    content = re.sub(r'(CREATE\s+TABLE\s+)(?!(?:IF\s+NOT\s+EXISTS))(?!.*\bIF\s+NOT\s+EXISTS\b)', 
                     r'\1IF NOT EXISTS ', content, flags=re.IGNORECASE)

    # 2. INDEXES: Use DO block check for existence
    index_pattern = r'(CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(\w+)(\s+ON\s+.*?);'
    def wrap_index(match):
        return (f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = '{match.group(2)}') "
                f"THEN {match.group(0)} END IF; END $$;")
    content = re.sub(index_pattern, wrap_index, content, flags=re.IGNORECASE | re.DOTALL)

    # 3. ENUMS: Wrap in DO block
    enum_pattern = r'(?<!DO\s\$\$\sBEGIN\s)(CREATE\s+TYPE\s+.*?\s+AS\s+ENUM\s*\((?:.|\n)*?\);)'
    content = re.sub(enum_pattern, r'DO $$ BEGIN \1 EXCEPTION WHEN duplicate_object THEN null; END $$;', 
                     content, flags=re.IGNORECASE | re.DOTALL)

    # 4. FUNCTIONS: Use CREATE OR REPLACE
    func_pattern = r'(CREATE\s+)(FUNCTION\s+)(public\.\w+)\s*\((.*?)\)'
    content = re.sub(func_pattern, r'CREATE OR REPLACE \2\3(\4)', content, flags=re.IGNORECASE)

    # 5. CONSTRAINTS: Check pg_constraint
    constraint_pattern = r'(ALTER\s+TABLE\s+ONLY\s+public\.\w+\s+ADD\s+CONSTRAINT\s+)(\w+)(.*?);'
    def wrap_constraint(match):
        return (f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{match.group(2)}') "
                f"THEN {match.group(0)} END IF; END $$;")
    content = re.sub(constraint_pattern, wrap_constraint, content, flags=re.IGNORECASE | re.DOTALL)

    # 6. TRIGGERS: Check pg_trigger
    # Pattern matches: CREATE TRIGGER name ... ON table ...
    trigger_pattern = r'(CREATE\s+TRIGGER\s+)(\w+)(\s+.*?ON\s+public\.\w+.*?);'
    def wrap_trigger(match):
        trigger_name = match.group(2)
        full_statement = match.group(0)
        return (f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '{trigger_name}') "
                f"THEN {full_statement} END IF; END $$;")
    content = re.sub(trigger_pattern, wrap_trigger, content, flags=re.IGNORECASE | re.DOTALL)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Success! Schema is now fully idempotent: {output_path}")

if __name__ == "__main__":
    update_sql_schema('complete_schema.sql')