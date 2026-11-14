"""Trusted adapter boundary tests only; no third-party source executed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
ADAPTER=Path(__file__).resolve().parents[1]/'integrations/candidates/fossen_python_vehicle_simulator_adapter.py'
spec=importlib.util.spec_from_file_location('fossen_candidate_adapter',ADAPTER)
adapter=importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
class AdapterIsolationTests(unittest.TestCase):
    def test_missing_source_rejected(self):
        original=adapter.SOURCE_ROOT
        try:
            with tempfile.TemporaryDirectory() as t:
                adapter.SOURCE_ROOT=t
                with self.assertRaises(adapter.AdapterError):
                    adapter.load_pinned_gnc()
        finally: adapter.SOURCE_ROOT=original
    def test_symlink_source_rejected(self):
        original=adapter.SOURCE_ROOT
        try:
            with tempfile.TemporaryDirectory() as t:
                root=Path(t); link=root/'python_vehicle_simulator/lib/gnc.py'
                link.parent.mkdir(parents=True)
                target=root/'target.py'; target.write_text('x=1')
                link.symlink_to(target)
                adapter.SOURCE_ROOT=t
                with self.assertRaises(adapter.AdapterError):
                    adapter.load_pinned_gnc()
        finally: adapter.SOURCE_ROOT=original
    def test_imports_exact_file_not_package_init(self):
        original=adapter.SOURCE_ROOT
        try:
            with tempfile.TemporaryDirectory() as t:
                lib=Path(t)/'python_vehicle_simulator/lib'
                lib.mkdir(parents=True)
                (lib/'__init__.py').write_text('raise RuntimeError("must not import initializer")')
                (lib/'gnc.py').write_text('def ssa(x):\n  return 0.125\n')
                adapter.SOURCE_ROOT=t
                self.assertEqual(adapter.load_pinned_gnc().ssa(1),0.125)
        finally: adapter.SOURCE_ROOT=original
if __name__=='__main__':
    unittest.main()
