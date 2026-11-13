"""Reviewed deterministic CalculiX C3D8 axial-bar template generator.

Input JSON is already range-checked by templates.py. Units: N, mm, MPa.
This is a commissioning/template example, not a vessel structural model.
"""
from pathlib import Path
import argparse,json

p=argparse.ArgumentParser()
p.add_argument("--output-dir",required=True)
p.add_argument("--parameters",required=True)
a=p.parse_args()
params=json.loads(Path(a.parameters).read_text())
L=float(params["lengthMm"])
F=float(params["loadN"])
E=float(params["youngsModulusMpa"])
out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)

# 10 equal C3D8 elements; cross-section 1 mm x 1 mm.
nodes=[]
for i in range(11):
    x=L*i/10
    base=4*i+1
    nodes.extend([
        (base,x,0.0,0.0),(base+1,x,1.0,0.0),
        (base+2,x,1.0,1.0),(base+3,x,0.0,1.0)
    ])
elements=[]
for i in range(10):
    n=4*i+1;m=n+4
    elements.append((i+1,n,n+1,n+2,n+3,m,m+1,m+2,m+3))
left=[1,2,3,4];right=[41,42,43,44]
lines=['*HEADING','APPROVED TEMPLATE AXIAL BAR -- NOT A VESSEL MODEL','*NODE']
lines += [f'{n},{x:.12g},{y},{z}' for n,x,y,z in nodes]
lines += ['*ELEMENT,TYPE=C3D8,ELSET=EALL']
lines += [','.join(map(str,e)) for e in elements]
lines += ['*NSET,NSET=LEFT',','.join(map(str,left)),
          '*NSET,NSET=RIGHT',','.join(map(str,right)),
          '*MATERIAL,NAME=MAT','*ELASTIC',f'{E:.12g},0.3',
          '*SOLID SECTION,ELSET=EALL,MATERIAL=MAT','*STEP','*STATIC',
          '*BOUNDARY','LEFT,1,3,0.','*CLOAD']
lines += [f'{n},1,{F/4:.12g}' for n in right]
lines += ['*NODE PRINT,NSET=RIGHT','U','*EL PRINT,ELSET=EALL','S',
          '*NODE FILE','U','*EL FILE','S','*END STEP']
(out/'model.inp').write_text('\n'.join(lines)+'\n')
print(json.dumps({"lengthMm":L,"loadN":F,"youngsModulusMpa":E,
                  "analyticalStressMpa":F,
                  "analyticalDisplacementMm":F*L/E},sort_keys=True))
