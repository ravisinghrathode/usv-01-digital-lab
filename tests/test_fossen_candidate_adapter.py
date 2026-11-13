"""Offline contract tests. Fake GNC functions do not constitute upstream verification."""
import importlib.util
import math
import pathlib
import unittest

MODULE = pathlib.Path(__file__).resolve().parents[1] / "integrations/candidates/fossen_python_vehicle_simulator_adapter.py"
spec = importlib.util.spec_from_file_location("fossen_candidate_adapter", MODULE)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class FakeGnc:
    @staticmethod
    def ssa(x):
        return (x + math.pi) % (2 * math.pi) - math.pi

    @staticmethod
    def sat(x, minimum, maximum):
        return min(max(x, minimum), maximum)

    @staticmethod
    def Rzyx(phi, theta, psi):
        if (phi, theta, psi) != (0, 0, 0):
            raise AssertionError("identity fixture only")
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]

    @staticmethod
    def Smtrx(v):
        x, y, z = v
        return [[0, -z, y], [z, 0, -x], [-y, x, 0]]


class AdapterContractTests(unittest.TestCase):
    def setUp(self):
        self.gnc = FakeGnc()

    def test_wrap_three_pi_to_minus_pi(self):
        result = adapter.dispatch({"operation": "ssa", "angleRad": 3 * math.pi}, self.gnc)
        self.assertAlmostEqual(result["value"], -math.pi)

    def test_saturation(self):
        self.assertEqual(adapter.dispatch({"operation": "sat", "value": 8, "minimum": -2, "maximum": 5}, self.gnc)["value"], 5)

    def test_zero_euler_rotations(self):
        expected = {f"r{i}{j}": float(i == j) for i in range(3) for j in range(3)}
        self.assertEqual(adapter.dispatch({"operation": "rzyx", "rollRad": 0, "pitchRad": 0, "yawRad": 0}, self.gnc), expected)

    def test_skew_matrix(self):
        result = adapter.dispatch({"operation": "smtrx", "vector": [1, 2, 3]}, self.gnc)
        self.assertEqual(result["s01"], -3)
        self.assertEqual(result["s20"], -2)
        self.assertEqual(result["s12"], -1)

    def test_refuse_unknown_operation(self):
        with self.assertRaises(adapter.AdapterError):
            adapter.dispatch({"operation": "__import__", "module": "os"}, self.gnc)

    def test_refuse_boolean_as_number(self):
        with self.assertRaises(adapter.AdapterError):
            adapter.dispatch({"operation": "ssa", "angleRad": True}, self.gnc)

    def test_refuse_nonfinite_and_excessive_ranges(self):
        for value in (float("inf"), 1e9, "1.0", None):
            with self.subTest(value=value), self.assertRaises(adapter.AdapterError):
                adapter.dispatch({"operation": "ssa", "angleRad": value}, self.gnc)

    def test_refuse_swapped_saturation_bounds(self):
        with self.assertRaises(adapter.AdapterError):
            adapter.dispatch({"operation": "sat", "value": 1, "minimum": 2, "maximum": -2}, self.gnc)


if __name__ == "__main__":
    unittest.main()
