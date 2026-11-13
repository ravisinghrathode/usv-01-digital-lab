import json
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
