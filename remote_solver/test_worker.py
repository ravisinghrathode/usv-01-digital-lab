"""Worker tests use fake subprocesses only unless a dedicated commissioning job says otherwise."""
import io
import os
import subprocess
import tempfile
import unittest
import zipfile
from unittest.mock import patch
from pathlib import Path

from worker import sha256, run_staged_case, unzip_restricted, validate_request, resource_policy, _parse_c3d8_mesh_quality

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
        self.artifacts=self.root/'artifacts'
        self.model=(b'*HEADING\n*NODE\n'
            b'1,0,0,0\n2,1,0,0\n3,1,1,0\n4,0,1,0\n'
            b'5,0,0,1\n6,1,0,1\n7,1,1,1\n8,0,1,1\n'
            b'*ELEMENT,TYPE=C3D8,ELSET=EALL\n1,1,2,3,4,5,6,7,8\n')
        self.payload=bundle({'model.inp':self.model})
        self.datahash=sha256(self.payload)
        (self.staging/(self.datahash[7:]+'.zip')).write_bytes(self.payload)
        self.manifest={
            'jobRef':'UNIT_CCX_001',
            'sourceCommit':'c'*40,
            'family':'CALCULIX_FEA',
            'inputArtifactUri':'https://approved.example.org/staged/abc',
            'inputArtifactSha256':self.datahash,
            'meshArtifactSha256':sha256(self.model),
            'manifestSha256':sha256(b'exact-sample-manifest-proxy-hash'),
            'qualityPlan':{'sourceReference':'UNIT_TEST_ONLY_NOT_ACTUAL_CONVERGENCE',
                'residualThreshold':0.01,'gridUncertaintyMaxFraction':0.03,
                'maxMeshSkewness':1.2,'maxNonOrthogonalityDeg':45,
                'maxElementAspectRatio':5,'minScaledJacobian':0.2}
        }
    def tearDown(self):
        self.temp.cleanup()

    def test_fixed_binary_calls_version_and_retains_calculix_results(self):
        calls=[]
        def fake(args,**kwargs):
            calls.append((args,kwargs))
            cwd=Path(kwargs['cwd'])
            if args==['ccx','-v']:
                return subprocess.CompletedProcess(args,0,stdout='CalculiX Version 2.23',stderr='')
            if args==['ccx','-i','model']:
                (cwd/'model.dat').write_text(
                    ' stresses at integration points\n'
                    ' 1 1 100.0 -50.0 10.0 2.0 3.0 4.0\n'
                    ' displacements\n'
                    ' 1 0.003 0.004 0.000\n')
                (cwd/'model.frd').write_text('synthetic unit-test FRD')
                return subprocess.CompletedProcess(args,0,stdout='solver completed',stderr='')
            raise AssertionError(args)
        result=run_staged_case(
            self.manifest,self.staging,self.root/'work',{self.datahash},
            runner=fake,artifact_root=self.artifacts,isolation_mode='TEST_NO_NAMESPACE')
        self.assertEqual(result['state'],'COMPUTE_DONE_EVIDENCE_PENDING')
        self.assertFalse(result['engineeringReleaseAuthorized'])
        self.assertEqual(result['solverVersion'],'2.23')
        self.assertEqual(result['keyResults']['maxAbsoluteStressComponent'],100.0)
        self.assertAlmostEqual(result['keyResults']['maxDisplacementMagnitude'],0.005,places=8)
        self.assertEqual(len(calls),2)
        self.assertEqual(calls[0][0],['ccx','-v'])
        self.assertEqual(calls[1][0],['ccx','-i','model'])
        self.assertIn('preexec_fn',calls[1][1])
        self.assertNotIn('shell',calls[1][1])
        archive=Path(result['outputArtifactLocalPath'])
        self.assertTrue(archive.is_file())
        self.assertTrue(result['outputSha256'].startswith('sha256:'))
        with zipfile.ZipFile(archive) as evidence:
            self.assertIn('model.dat',evidence.namelist())
            self.assertIn('model.frd',evidence.namelist())
            self.assertIn('solver-summary.json',evidence.namelist())

    def _openfoam_fixture(self):
        points=b'pre-generated points'
        payload=bundle({'constant/polyMesh/points':points})
        digest=sha256(payload)
        (self.staging/(digest[7:]+'.zip')).write_bytes(payload)
        manifest={**self.manifest,
            'jobRef':'UNIT_FOAM_001','family':'OPENFOAM_CFD',
            'inputArtifactSha256':digest,'meshArtifactSha256':sha256(points),
            'manifestSha256':sha256(b'foam-manifest'),
            'qualityPlan':{**self.manifest['qualityPlan'],
                'residualThreshold':1e-4,'maxMeshSkewness':2.0,'maxNonOrthogonalityDeg':65}
        }
        return manifest,digest

    def test_openfoam_mesh_residual_gate_and_force_results_are_retained(self):
        manifest,digest=self._openfoam_fixture()
        def fake(args,**kwargs):
            cwd=Path(kwargs['cwd'])
            if args==['simpleFoam','-help']:
                return subprocess.CompletedProcess(args,0,stdout='OpenFOAM-v2506 help',stderr='')
            if args[0]=='checkMesh':
                return subprocess.CompletedProcess(args,0,stdout=
                    'Mesh non-orthogonality Max: 21 average: 5\nMax skewness = 0.41 OK.\n',stderr='')
            if args==['simpleFoam']:
                out=(cwd/'postProcessing/forceCoeffs/0')
                out.mkdir(parents=True)
                (out/'coefficient.dat').write_text(
                    '# Time Cd Cl CmPitch\n0 0.011 0.002 -0.0003\n100 0.012 0.001 -0.0002\n')
                return subprocess.CompletedProcess(args,0,stdout=
                    'Solving for Ux, Initial residual = 0.01, Final residual = 1e-6, No Iterations 2\n'
                    'Solving for p, Initial residual = 0.02, Final residual = 5e-5, No Iterations 3\n',stderr='')
            raise AssertionError(args)
        result=run_staged_case(
            manifest,self.staging,self.root/'work',{digest},runner=fake,
            artifact_root=self.artifacts,isolation_mode='TEST_NO_NAMESPACE')
        self.assertEqual(result['solverVersion'],'2506')
        self.assertEqual(result['quality']['maximumMeshSkewness'],0.41)
        self.assertEqual(result['quality']['maximumNonOrthogonalityDeg'],21.0)
        self.assertEqual(result['quality']['finalResidual'],5e-5)
        self.assertEqual(result['keyResults']['forceCoefficients']['coefficients']['Cd'],0.012)
        self.assertTrue(Path(result['outputArtifactLocalPath']).is_file())

    def test_openfoam_rejects_mesh_or_residual_over_threshold(self):
        manifest,digest=self._openfoam_fixture()
        def bad_mesh(args,**kwargs):
            if args==['simpleFoam','-help']:
                return subprocess.CompletedProcess(args,0,stdout='OpenFOAM-v2506',stderr='')
            if args[0]=='checkMesh':
                return subprocess.CompletedProcess(args,0,stdout=
                    'Mesh non-orthogonality Max: 70 average: 5\nMax skewness = 0.4 OK.\n',stderr='')
            return subprocess.CompletedProcess(args,0,stdout=
                'Solving for Ux, Final residual = 1e-6',stderr='')
        with self.assertRaisesRegex(RuntimeError,'non-orthogonality'):
            run_staged_case(manifest,self.staging,self.root/'work',{digest},runner=bad_mesh,
                artifact_root=self.artifacts,isolation_mode='TEST_NO_NAMESPACE')

        def bad_residual(args,**kwargs):
            if args==['simpleFoam','-help']:
                return subprocess.CompletedProcess(args,0,stdout='OpenFOAM-v2506',stderr='')
            if args[0]=='checkMesh':
                return subprocess.CompletedProcess(args,0,stdout=
                    'Mesh non-orthogonality Max: 20 average: 5\nMax skewness = 0.4 OK.\n',stderr='')
            return subprocess.CompletedProcess(args,0,stdout=
                'Solving for Ux, Initial residual = 1, Final residual = 0.01, No Iterations 1',stderr='')
        with self.assertRaisesRegex(RuntimeError,'residual'):
            run_staged_case(manifest,self.staging,self.root/'work',{digest},runner=bad_residual,
                artifact_root=self.artifacts,isolation_mode='TEST_NO_NAMESPACE')

    def test_production_command_requires_network_namespace_wrapper(self):
        manifest,digest=self._openfoam_fixture()
        seen=[]
        def fake(args,**kwargs):
            seen.append(args)
            return subprocess.CompletedProcess(args,1,stdout='',stderr='unshare unavailable')
        with self.assertRaises(RuntimeError):
            run_staged_case(manifest,self.staging,self.root/'work',{digest},runner=fake,
                artifact_root=self.artifacts,isolation_mode='UNSHARE_NET')
        self.assertEqual(seen[0][:5],['unshare','--user','--map-root-user','--net','--'])

    def test_resource_limits_are_host_configurable_but_bounded(self):
        with patch.dict(os.environ,{
            'USV_SOLVER_CPU_SECONDS':'3600',
            'USV_SOLVER_ADDRESS_SPACE_BYTES':str(16*1024*1024*1024),
            'USV_SOLVER_FILE_BYTES':str(4*1024*1024*1024),
            'USV_SOLVER_OPEN_FILES':'2048',
            'USV_SOLVER_PROCESSES':'128',
            'USV_SOLVER_WALL_TIMEOUT_SECONDS':'5400'
        },clear=False):
            policy=resource_policy()
            self.assertEqual(policy['cpuSeconds'],3600)
            self.assertEqual(policy['addressSpaceBytes'],16*1024*1024*1024)
            self.assertEqual(policy['wallTimeoutSeconds'],5400)
        with patch.dict(os.environ,{'USV_SOLVER_ADDRESS_SPACE_BYTES':'1'},clear=False):
            with self.assertRaisesRegex(RuntimeError,'outside allowed host range'):
                resource_policy()
        with patch.dict(os.environ,{'USV_SOLVER_CPU_SECONDS':'not-an-int'},clear=False):
            with self.assertRaisesRegex(RuntimeError,'must be an integer'):
                resource_policy()

    def test_c3d8_jacobian_checks_corners_and_gauss_points_not_only_center(self):
        distorted=(b'*HEADING\n*NODE\n'
            b'1,0,0,0\n2,1,0,0\n3,1,1,0\n4,0,1,0\n'
            b'5,0,0,1\n6,1,0,1\n7,0.8254245,-0.0889408,1.4746455\n8,0,1,1\n'
            b'*ELEMENT,TYPE=C3D8,ELSET=EALL\n1,1,2,3,4,5,6,7,8\n')
        model=self.root/'distorted.inp'
        model.write_bytes(distorted)
        q=_parse_c3d8_mesh_quality(model)
        self.assertEqual(q['jacobianSamplesPerElement'],17)
        self.assertLess(q['minimumScaledJacobian'],0)
        self.assertIsNotNone(q['worstJacobianNaturalCoordinates'])

    def test_rejects_non_allowlisted_or_changed_archive(self):
        with self.assertRaises(ValueError):
            run_staged_case(self.manifest,self.staging,self.root/'work',set(),
                isolation_mode='TEST_NO_NAMESPACE')
        (self.staging/(self.datahash[7:]+'.zip')).write_bytes(b'not same')
        with self.assertRaises(ValueError):
            run_staged_case(self.manifest,self.staging,self.root/'work',{self.datahash},
                isolation_mode='TEST_NO_NAMESPACE')

    def test_rejects_wrong_mesh_and_invalid_source(self):
        x={**self.manifest,'meshArtifactSha256':sha256(b'forged')}
        with self.assertRaises(ValueError):
            run_staged_case(x,self.staging,self.root/'work',{self.datahash},
                isolation_mode='TEST_NO_NAMESPACE')
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
            if args==['ccx','-v']:
                return subprocess.CompletedProcess(args,0,stdout='CalculiX Version 2.23',stderr='')
            return subprocess.CompletedProcess(args,1,stdout='solver failed',stderr='')
        with self.assertRaises(RuntimeError):
            run_staged_case(self.manifest,self.staging,self.root/'work',
                {self.datahash},runner=failed,artifact_root=self.artifacts,
                isolation_mode='TEST_NO_NAMESPACE')

if __name__=='__main__':
    unittest.main()
