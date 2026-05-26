import ast
from pathlib import Path
import unittest


class DatabaseSchemaTests(unittest.TestCase):
    def test_auth_and_chat_tables_are_declared_for_startup_creation(self):
        source = Path("db.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        table_names = set()

        for node in module.body:
            if not isinstance(node, ast.ClassDef):
                continue
            for statement in node.body:
                if (
                    isinstance(statement, ast.Assign)
                    and any(isinstance(target, ast.Name) and target.id == "__tablename__" for target in statement.targets)
                    and isinstance(statement.value, ast.Constant)
                ):
                    table_names.add(statement.value.value)

        self.assertTrue({"users", "chat_sessions", "chat_messages"}.issubset(table_names))


if __name__ == "__main__":
    unittest.main()
