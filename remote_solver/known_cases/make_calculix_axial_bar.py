"""Generate a small 10-element axial bar with a closed-form reference.

Units: N, mm, MPa.
L=10 mm, A=1 mm^2, E=210000 MPa, total axial load F=100 N.
Ideal 1-D references: sigma=F/A=100 MPa, delta=F*L/(A*E)=0.0047619048 mm.
The 3-D FE result is only a commissioning benchmark, not a naval structure case.
"""
from pathlib import Path
import sys

out=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
out.mkdir(parents=True,exist_ok=True)
nodes=[]
for i in range(11):
    x=float(i)
    base=4*i+1
    nodes.extend([
        (base,x,0.0,0.0),(base+1,x,1.0,0.0),
        (base+2,x,1.0,1.0),(base+3,x,0.0,1.0)
    ])
elements=[]
for i in range(10):
    a=4*i+1;b=a+4
    elements.append((i+1,a,a+1,a+2,a+3,b,b+1,b+2,b+3))
left=[1,2,3,4]
right=[41,42,43,44]
lines=['*HEADING','USV solver commissioning axial bar -- NOT a vessel model','*NODE']
lines += [f'{n},{x},{y},{z}' for n,x,y,z in nodes]
lines += ['*ELEMENT,TYPE=C3D8,ELSET=EALL']
lines += [','.join(map(str,e)) for e in elements]
lines += ['*NSET,NSET=LEFT',','.join(map(str,left)),
          '*NSET,NSET=RIGHT',','.join(map(str,right)),
          '*MATERIAL,NAME=STEEL_TEST','*ELASTIC','210000.,0.3',
          '*SOLID SECTION,ELSET=EALL,MATERIAL=STEEL_TEST',
          '*STEP','*STATIC',
          '*BOUNDARY','LEFT,1,3,0.',
          '*CLOAD']
lines += [f'{n},1,25.' for n in right]
lines += ['*NODE PRINT,NSET=RIGHT','U',
          '*EL PRINT,ELSET=EALL','S',
          '*NODE FILE','U',
          '*EL FILE','S',
          '*END STEP']
(out/'model.inp').write_text('\n'.join(lines)+'\n')
print(out/'model.inp')
