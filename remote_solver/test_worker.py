"""Safety/property tests. Fake subprocess only; no solver execution is claimed."""
import io
import os
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

from worker import sha256, run_staged_case, unzip_restricted, validate_request

def bundle(mapping):
    bio=io.BytesIO()
    with zipfile.ZipFile(bio,'w') as z:
        for key,val in mapping.items():
            z.writestr(key,val)
    return bio.getvalue()

class WorkerTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.staging=self.root/'staged'
        self.staging.mkdir()
        self.payload=bundle({'model.inp':'*HEADING\n*NODE\n1,0,0,0\n'})
        self.datahash=sha256(self.payload)
        (self.staging/(self.datahash[7:]+'.zip')).write_bytes(self.payload)
        self.manifest={
            'jobRef':'UNIT_CCX_001',
            'sourceCommit':'c'*40,
            'family':'CALCULIX_FEA',
            'inputArtifactUri':'https://approved.example.org/staged/abc',
            'inputArtifactSha256':self.datahash,
            'meshArtifactSha256':sha256(b'*HEADING\n*NODE\n1,0,0,0\n'),
            'manifestSha256':sha256(b'exact-sample-manifest-proxy-hash'),
            'qualityPlan':{'sourceReference':'UNIT_TEST_ONLY_NOT_ACTUAL_CONVERGENCE',
                'residualThreshold':0.01,'gridUncertaintyMaxFraction':0.03,
                'maxMeshSkewness':1.2,'maxNonOrthogonalityDeg':45}
        }
    def tearDown(self):
        self.temp.cleanup()
    def test_real_binary_invocation_shape_but_no_synthetic_validation(self):
        calls=[]
        def fake(args,**kwargs):
            calls.append((args,kwargs))
            return subprocess.CompletedProcess(args,0,stdout='mocked stdout',stderr='')
        result=run_staged_case(self.manifest,self.staging,self.root/'work',
            {self.datahash},runner=fake)
        self.assertEqual(result['state'],'COMPLETED')
        self.assertFalse(result['engineeringReleaseAuthorized'])
        self.assertIsNone(result['quality'])
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0][0],['ccx','-i','model'])
        self.assertNotIn('shell',calls[0][1])
        self.assertEqual(result['acceptedInputDigest'],self.manifest['manifestSha256'])
    def test_rejects_non_allowlisted_or_changed_archive(self):
        with self.assertRaises(ValueError):
            run_staged_case(self.manifest,self.staging,self.root/'work',set())
        (self.staging/(self.datahash[7:]+'.zip')).write_bytes(b'not same')
        with self.assertRaises(ValueError):
            run_staged_case(self.manifest,self.staging,self.root/'work',{self.datahash})
    def test_rejects_wrong_mesh_and_invalid_source(self):
        x={**self.manifest,'meshArtifactSha256':sha256(b'forged')}
        with self.assertRaises(ValueError):
            run_staged_case(x,self.staging,self.root/'work',{self.datahash})
        y={**self.manifest,'sourceCommit':'not-a-commit'}
        with self.assertRaises(ValueError):
            validate_request(y,{self.datahash})
    def test_no_shell_command_or_zip_traversal(self):
        with tempfile.TemporaryDirectory() as temp:
            for malicious in ['../escape','/root/escape','case\\relative']:
                with self.assertRaises(ValueError):
                    unzip_restricted(bundle({malicious:'bad'}),Path(temp))
    def test_solver_failure_does_not_return_fake_results(self):
        def failed(args,**kw):
            return subprocess.CompletedProcess(args,1,stdout='solver failed',stderr='')
        with self.assertRaises(RuntimeError):
            run_staged_case(self.manifest,self.staging,self.root/'work',
                {self.datahash},runner=failed)

if __name__=='__main__':
    unittest.main()
