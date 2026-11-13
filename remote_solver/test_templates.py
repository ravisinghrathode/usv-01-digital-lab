import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from templates import materialize_template_job
from worker import sha256

GENERATOR = r'''import argparse,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("--output-dir",required=True)
p.add_argument("--parameters",required=True)
a=p.parse_args()
params=json.loads(Path(a.parameters).read_text())
out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)
L=params["lengthMm"]
text=f"""*HEADING
APPROVED TEMPLATE TEST
*NODE
1,0,0,0
2,{L},0,0
3,{L},1,0
4,0,1,0
5,0,0,1
6,{L},0,1
7,{L},1,1
8,0,1,1
*ELEMENT,TYPE=C3D8,ELSET=EALL
1,1,2,3,4,5,6,7,8
"""
(out/"model.inp").write_text(text)
print("generated")
'''

class TemplateMaterializationTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        self.gen=self.root/"generator.py"
        self.gen.write_text(GENERATOR)
        self.catalog=self.root/"catalog.json"
        self.catalog.write_text(json.dumps({"templates":[{
            "id":"STRUCT_BAR_V1",
            "family":"CALCULIX_FEA",
            "generator":str(self.gen),
            "generatorSha256":sha256(self.gen.read_bytes()),
            "meshPath":"model.inp",
            "parameterBounds":{"lengthMm":{"min":1,"max":100}},
            "qualityPlan":{
                "sourceReference":"UNIT_TEST_TEMPLATE_PLAN",
                "residualThreshold":0.01,
                "gridUncertaintyMaxFraction":0.05,
                "maxMeshSkewness":4,
                "maxNonOrthogonalityDeg":70,
                "maxElementAspectRatio":200,
                "minScaledJacobian":0.01
            }
        }]}))
        self.stage=self.root/"stage"; self.work=self.root/"work"
        self.base={
            "jobRef":"TPL_CASE_001",
            "sourceCommit":"a"*40,
            "templateId":"STRUCT_BAR_V1",
            "templateDigest":sha256(self.gen.read_bytes()),
            "parameters":{"lengthMm":10}
        }
    def tearDown(self):
        self.tmp.cleanup()

    def test_materializes_deterministic_hash_bound_case_without_operator_per_case_staging(self):
        manifest,approved=materialize_template_job(
            self.base,self.catalog,self.stage,self.work,isolation_mode="TEST_NO_NAMESPACE")
        self.assertEqual(manifest["family"],"CALCULIX_FEA")
        self.assertEqual(approved,{manifest["inputArtifactSha256"]})
        staged=self.stage/(manifest["inputArtifactSha256"][7:]+".zip")
        self.assertTrue(staged.is_file())
        self.assertEqual(sha256(staged.read_bytes()),manifest["inputArtifactSha256"])
        self.assertEqual(manifest["templateMaterialization"]["templateId"],"STRUCT_BAR_V1")
        second={**self.base,"jobRef":"TPL_CASE_002"}
        manifest2,_=materialize_template_job(
            second,self.catalog,self.stage,self.work,isolation_mode="TEST_NO_NAMESPACE")
        self.assertEqual(manifest2["inputArtifactSha256"],manifest["inputArtifactSha256"])

    def test_openfoam_template_can_run_only_fixed_blockmesh_preprocessor(self):
        generator=self.root/"openfoam_generator.py"
        generator.write_text(
            'import argparse,json\n'
            'from pathlib import Path\n'
            'p=argparse.ArgumentParser();p.add_argument("--output-dir",required=True);p.add_argument("--parameters",required=True);a=p.parse_args()\n'
            'out=Path(a.output_dir);(out/"system").mkdir(parents=True);(out/"constant").mkdir(parents=True)\n'
            '(out/"system"/"blockMeshDict").write_text("fixed deterministic test dictionary")\n'
            '(out/"system"/"controlDict").write_text("application simpleFoam;")\n'
            '(out/"constant"/"transportProperties").write_text("nu [0 2 -1 0 0 0 0] 1e-6;")\n'
        )
        catalog=self.root/"openfoam_catalog.json"
        catalog.write_text(json.dumps({"templates":[{
            "id":"CFD_BLOCK_V1","family":"OPENFOAM_CFD","generator":str(generator),
            "generatorSha256":sha256(generator.read_bytes()),
            "meshPath":"constant/polyMesh/points","meshPreprocessor":"blockMesh",
            "parameterBounds":{"lengthMeters":{"min":1,"max":20}},
            "qualityPlan":{"sourceReference":"UNIT_TEST_ONLY","residualThreshold":0.01,
                "gridUncertaintyMaxFraction":0.05,"maxMeshSkewness":4,
                "maxNonOrthogonalityDeg":70}
        }]}))
        request={"jobRef":"TPL_CFD_001","sourceCommit":"b"*40,
            "templateId":"CFD_BLOCK_V1","templateDigest":sha256(generator.read_bytes()),
            "parameters":{"lengthMeters":10}}
        seen=[]
        def runner(argv,**kwargs):
            seen.append(argv)
            if argv[0].endswith("python") or "python" in Path(argv[0]).name:
                return subprocess.run(argv,**kwargs)
            if argv==["blockMesh"]:
                case=Path(kwargs["cwd"])
                mesh=case/"constant"/"polyMesh"
                mesh.mkdir(parents=True)
                (mesh/"points").write_text("synthetic fixed preprocessor mesh")
                return subprocess.CompletedProcess(argv,0,stdout="blockMesh synthetic test",stderr="")
            raise AssertionError(argv)
        manifest,approved=materialize_template_job(
            request,catalog,self.stage,self.work,runner=runner,isolation_mode="TEST_NO_NAMESPACE")
        self.assertEqual(manifest["family"],"OPENFOAM_CFD")
        self.assertEqual(manifest["templateMaterialization"]["meshPreprocessor"],"blockMesh")
        self.assertIn(["blockMesh"],seen)
        self.assertEqual(approved,{manifest["inputArtifactSha256"]})

    def test_catalog_rejects_arbitrary_preprocessor_command(self):
        raw=json.loads(self.catalog.read_text())
        raw["templates"][0]["family"]="OPENFOAM_CFD"
        raw["templates"][0]["meshPreprocessor"]="bash -c anything"
        self.catalog.write_text(json.dumps(raw))
        with self.assertRaisesRegex(ValueError,"Only fixed blockMesh"):
            materialize_template_job(
                self.base,self.catalog,self.stage,self.work,isolation_mode="TEST_NO_NAMESPACE")

    def test_rejects_parameter_outside_operator_approved_envelope(self):
        bad={**self.base,"parameters":{"lengthMm":1000}}
        with self.assertRaisesRegex(ValueError,"outside approved envelope"):
            materialize_template_job(
                bad,self.catalog,self.stage,self.work,isolation_mode="TEST_NO_NAMESPACE")

    def test_rejects_generator_digest_swap(self):
        bad={**self.base,"templateDigest":"sha256:"+"0"*64}
        with self.assertRaisesRegex(ValueError,"approved generator digest"):
            materialize_template_job(
                bad,self.catalog,self.stage,self.work,isolation_mode="TEST_NO_NAMESPACE")

if __name__=="__main__":
    unittest.main()
