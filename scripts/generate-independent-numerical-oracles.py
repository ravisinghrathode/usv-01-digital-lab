#!/usr/bin/env python3
"""Auditable second implementation of arithmetic/geometry reference cases.

This script does not import the TypeScript calculators. Decimal arithmetic
independently builds hydrostatic, mass and electrical reference values;
a cross-product CPA identity validates a different geometric formulation.
Only mathematical consistency is tested, NOT hydrodynamic/physical fidelity.
"""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json, math, random

getcontext().prec = 40
rng = random.Random(20261113)
def n(x): return D(str(x))
def r(lo, hi, digits=2):
    k = 10 ** digits
    return rng.randrange(round(lo*k), round(hi*k)+1)/k
def f(x): return float(x)
def wrap(spec, expected, ident):
    return {"id":ident, "input":spec, "reference":expected}

out = {
  "metadata": {
    "source": "Independent Python Decimal + cross-product oracle, seed=20261113",
    "basis": "pure arithmetic, energy balance, Euclidean geometry",
    "engineeringAccuracyCertified": False,
    "note": "No physical hull, CFD, class, thermal, battery or vessel safety validation"
  },
  "hydro": [], "resistance": [], "mass": [], "electrical": [], "colregs": []
}
for i in range(150):
    L=r(5,30);B=r(1.4,7.5);T=r(.35,3);cb=r(.31,.85,3)
    vol=n(L)*n(B)*n(T)*n(cb)
    mass=vol*n(1025)/n(1000)
    a={"lwlMeters":L,"beamMeters":B,"draftMeters":T,"blockCoefficientCb":cb,
       "seawaterDensityKgM3":1025}
    out["hydro"].append(wrap(a,{"displacedVolumeM3":f(vol),
       "displacementTonnes":f(mass)},f"H-{i:03}"))
for i in range(150):
    L=r(6,22);B=r(1.5,6);T=r(.35,2.2);cb=r(.34,.76,3)
    Fn=r(.15,1.05,4)
    velocity=Fn*math.sqrt(9.80665*L)
    k=velocity/(1852/3600)
    mass=f(n(L)*n(B)*n(T)*n(cb)*n(1025)/n(1000))
    eta=r(.45,.92,3)
    a={"lwlMeters":L,"beamMeters":B,"draftMeters":T,
       "displacementTonnes":mass,"speedKnots":k,
       "propulsiveEfficiencyEtaD":eta, "waterTempCelsius":15}
    Re=velocity*L/1.188e-6
    out["resistance"].append(wrap(a,{"speedMps":velocity,
         "froudeNumberFn":Fn,"reynoldsNumber":Re,"eta":eta},f"R-{i:03}"))
for i in range(150):
    components=[]
    for j in range(rng.randint(1,8)):
        components.append({"name":f"Part_{i}_{j}",
          "massKg":r(1,8000),"lcgMetersFromTransom":r(-2,15),
          "tcgMetersFromCl":r(-3,3),"vcgMetersFromKeel":r(0,5),
          "designMarginPercent":r(0,30)})
    kgs=[n(x["massKg"]) for x in components]
    gross=[m*(1+n(x["designMarginPercent"])/n(100)) for m,x in zip(kgs,components)]
    total=sum(gross);base=sum(kgs)
    moment=lambda key:sum(g*n(x[key]) for g,x in zip(gross,components))
    a={"components":components}
    out["mass"].append(wrap(a,{"lightshipMassKg":f(base),
        "designMarginMassKg":f(total-base),
        "totalDisplacementKg":f(total),
        "compositeLcgMeters":f(moment("lcgMetersFromTransom")/total),
        "compositeTcgMeters":f(moment("tcgMetersFromCl")/total),
        "compositeKgMeters":f(moment("vcgMetersFromKeel")/total)},f"M-{i:03}"))
for i in range(150):
    volts=rng.choice([24,48,96,360]); capacity=r(5,240);dod=r(.5,.95,3)
    consumers=[]
    for j in range(rng.randint(1,8)):
        consumers.append({"name":f"C_{i}_{j}","voltageV":volts,
          "continuousPowerW":r(10,20000),"intermittentPowerW":r(0,2000),
          "dutyCycle":r(0,1,3),"isEmergencyLoad":bool(rng.randrange(2))})
    cont=sum(n(x["continuousPowerW"]) for x in consumers)
    intr=sum(n(x["intermittentPowerW"])*n(x["dutyCycle"]) for x in consumers)
    mean=cont+intr
    peak=sum(n(x["continuousPowerW"])+n(x["intermittentPowerW"]) for x in consumers)
    emer=sum(n(x["continuousPowerW"])+n(x["intermittentPowerW"])*n(x["dutyCycle"])
             for x in consumers if x["isEmergencyLoad"])
    wh=n(capacity)*n(dod)*n(1000)
    a={"busVoltageV":volts,"batteryTotalKwh":capacity,
       "usableDepthOfDischarge":dod,"consumers":consumers}
    out["electrical"].append(wrap(a,{"totalContinuousPowerW":f(cont),
       "averagePowerW":f(mean),"peakPowerW":f(peak),"nominalBusCurrentAmps":f(mean/n(volts)),
       "usableBatteryKwh":f(wh/n(1000)),
       "idealizedEnergyUpperBoundHours":f(wh/mean),
       "emergencyLoadPowerW":f(emer),
       "idealizedEmergencyEnergyUpperBoundHours":f(wh/emer) if emer>0 else None},
       f"E-{i:03}"))
for i in range(200):
    own=r(0,359.9,3);tgt=r(0,359.9,3);bearing=r(0,359.9,3)
    ownv=r(0,30);tgtv=r(0,30)
    rngnm=r(.05,12)
    angle=math.pi/180
    vx=tgtv*math.sin(tgt*angle)-ownv*math.sin(own*angle) # East
    vy=tgtv*math.cos(tgt*angle)-ownv*math.cos(own*angle) # North
    x=rngnm*math.sin(bearing*angle);y=rngnm*math.cos(bearing*angle)
    v2=vx*vx+vy*vy
    relative=math.sqrt(v2)
    tcpa=max(0,-(x*vx+y*vy)/v2) if relative>.01 else 0
    cpa=abs(x*vy-y*vx)/relative if tcpa>0 and relative>.01 else rngnm
    a={"ownCourseDeg":own,"ownSpeedKnots":ownv,
       "targetBearingDeg":bearing,"bearingReference":"TRUE_NORTH",
       "targetRangeNm":rngnm,"targetCourseDeg":tgt,"targetSpeedKnots":tgtv,
       "visibilityMode":"UNKNOWN","ownVesselType":"UNKNOWN","targetVesselType":"UNKNOWN"}
    out["colregs"].append(wrap(a,{"relativeSpeedKnots":relative,
       "closestPointOfApproachCpaNm":cpa,"timeToCpaMinutes":tcpa*60},f"C-{i:03}"))
target=Path(__file__).resolve().parent.parent/"tests"/"fixtures"/"independent-arithmetic-oracles.json"
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(out,separators=(",", ":"))+"\n")
print("reference test vectors:",sum(len(v) for v in out.values() if isinstance(v,list)))
print("saved:",target)
