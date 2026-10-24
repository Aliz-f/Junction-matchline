"""Exercise validator failures using temporary documents, never the real specs."""

from contextlib import redirect_stdout
import io
from pathlib import Path
import tempfile
import unittest

from check_specs import EXPECTED, validate


class SpecValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "specs").mkdir()

    def run_check(self, allow_missing=False):
        output = io.StringIO()
        with redirect_stdout(output):
            result = validate(self.root, allow_missing)
        return result, output.getvalue()

    def populate(self):
        for name in EXPECTED:
            data = "# Validator test document\n\n**Version:** 2.4\n"
            if name.endswith("_Codex_Spec.md"):
                data += "\n## Appendix A — Test contract\n### A6. Test requirements\n"
                data += "\n".join(f"CT-{number:02d}" for number in range(1, 23)) + "\n"
            (self.root / "specs" / name).write_bytes(data.encode())

    def test_missing_strict_and_bootstrap(self):
        self.assertEqual(self.run_check()[0], 1)
        result, output = self.run_check(True)
        self.assertEqual(result, 0)
        self.assertIn("SKIPPED/BLOCKED", output)
        self.assertNotIn("PASS", output)

    def test_partial_always_fails_and_names_missing(self):
        (self.root / "specs" / EXPECTED[0]).touch()
        for mode in (False, True):
            result, output = self.run_check(mode)
            self.assertEqual(result, 1)
            for name in EXPECTED[1:]:
                self.assertIn(name, output)

    def test_complete(self):
        self.populate()
        self.assertEqual(self.run_check()[0], 0)

    def test_wrong_task_header(self):
        self.populate()
        path = self.root / "specs" / EXPECTED[1]
        path.write_bytes(path.read_bytes().replace(b"2.4", b"2.40"))
        self.assertEqual(self.run_check(True)[0], 1)

    def test_byte_difference_including_final_newline(self):
        self.populate()
        path = self.root / "specs" / EXPECTED[0]
        path.write_bytes(path.read_bytes().rstrip(b"\n"))
        self.assertIn("differs byte-for-byte", self.run_check()[1])

    def test_line_endings_are_not_normalized(self):
        self.populate()
        path = self.root / "specs" / EXPECTED[0]
        path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
        self.assertIn("differs byte-for-byte", self.run_check()[1])

    def test_missing_ct_and_outside_section_do_not_count(self):
        self.populate()
        for name in (EXPECTED[0], EXPECTED[2]):
            path = self.root / "specs" / name
            path.write_bytes(path.read_bytes().replace(b"CT-22\n", b"### A7. Other\nCT-22\n"))
        result, output = self.run_check()
        self.assertEqual(result, 1)
        self.assertIn("A6 missing IDs: CT-22", output)

    def test_missing_or_duplicate_appendix_heading(self):
        self.populate()
        path = self.root / "specs" / EXPECTED[0]
        original = path.read_bytes()
        for data in (original.replace(b"## Appendix A", b"## Appendix B"),
                     original + b"\n## Appendix A\n"):
            path.write_bytes(data)
            self.assertEqual(self.run_check()[0], 1)


if __name__ == "__main__":
    unittest.main()
