"""Procedural original example twin-hull USV concept art for NAL-UX-BL-001.

IMPORTANT: This is a cinematic visual asset, not approved USV-01 CAD, a
dimensionally accurate model, a simulation artifact or a design requirement.
Blender: 3.4+; background render. Transparent PNG output; edit this source
rather than manually modifying image files. No third-party ship photographs.
"""
from __future__ import annotations
import argparse, math, os
from mathutils import Vector
import bpy

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for m in bpy.data.materials:
        bpy.data.materials.remove(m)

def material(name, rgb, metallic=0.0, roughness=0.42, transmission=0.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1.0)
    m.use_nodes=True
    n=m.node_tree.nodes.get("Principled BSDF")
    n.inputs["Base Color"].default_value=(*rgb,1.0)
    n.inputs["Metallic"].default_value=metallic
    n.inputs["Roughness"].default_value=roughness
    if "Transmission" in n.inputs: n.inputs["Transmission"].default_value=transmission
    return m

def cube(name, loc, size, mat, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object; ob.name=name
    ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel>0:
      mod=ob.modifiers.new("Machined soft edges","BEVEL");mod.width=bevel;mod.segments=2
      mod2=ob.modifiers.new("Weighted normals","WEIGHTED_NORMAL");mod2.keep_sharp=True
    ob.data.materials.append(mat)
    return ob

def cylinder(name,loc,radius,depth,mat,vertices=24,rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,depth=depth,location=loc,rotation=rotation or (0,0,0))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    b=o.modifiers.new("Soft metal bevel","BEVEL");b.width=min(radius*.15,.025);b.segments=2
    o.modifiers.new("Surface normals","WEIGHTED_NORMAL")
    return o

def line(name,start,end,radius,mat,vertices=10):
    midpoint=(Vector(start)+Vector(end))*0.5
    direction=Vector(end)-Vector(start)
    ob=cylinder(name,midpoint,radius,direction.length,mat,vertices=vertices)
    ob.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    return ob

def loft(name, sections, mat):
    verts=[];faces=[]
    for x,y,z,w,deck,chine in sections:
      # z is bottom; 'deck' is crown height.
      verts.extend([(x,y-w*.36,z),(x,y+w*.36,z),
        (x,y+w,z+chine),(x,y+w*.9,deck),
        (x,y-w*.9,deck),(x,y-w,z+chine)])
    N=6
    for j in range(len(sections)-1):
      for i in range(N):
       a=j*N+i; b=j*N+(i+1)%N; c=(j+1)*N+(i+1)%N;d=(j+1)*N+i
       faces.append((a,b,c,d))
    faces.append(tuple(reversed(range(N))))
    faces.append(tuple((len(sections)-1)*N+i for i in range(N)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=False
    bevel=ob.modifiers.new("Hull fairing","BEVEL");bevel.width=.075;bevel.segments=3
    ob.modifiers.new("Hull surface normals","WEIGHTED_NORMAL")
    return ob

def roof_mesh(name, coords, mat):
    verts=[tuple(x) for x in coords]
    faces=[(0,1,2,3)]
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def build(variant):
    clear()
    is_c=variant=="candidate"
    white=material("Ceramic white hull coating",(.84,.90,.92),.18,.32)
    pearl=material("Pearl superstructure",(.90,.945,.96),.09,.28)
    dark=material("Navy blue lower hull",(.035,.105,.164),.27,.32)
    gunmetal=material("Machined charcoal alloy",(.12,.19,.245),.65,.29)
    silver=material("Stainless rails",(.65,.76,.80),.76,.23)
    glass=material("Smoke glazed panoramic bridge",(.045,.115,.163),.37,.12)
    rubber=material("Rubber seal and fenders",(.025,.047,.072),.18,.62)
    accent=material("Blue stripe candidate" if is_c else "Standard subtle stripe",
        (.006,.40,.61) if is_c else (.20,.35,.43),.25,.37)
    gold=material("Navigation amber",(.82,.43,.075),.15,.23)
    # Twin slender wave-piercing hulls, with curved chines, bow x=-5.
    for y in [-1.64,1.64]:
      sections=[
        (-5.55,y,-.44,.035,.69,.36),
        (-5.1,y,-.86,.41,.89,.56),
        (-4.0,y,-1.04,.62,.94,.77),
        (-2.6,y,-1.07,.68,.98,.80),
        (-.5,y,-1.08,.69,1.0,.82),
        (2.3,y,-1.06,.69,.99,.82),
        (4.1,y,-1.01,.65,.98,.78),
        (5.18,y,-.83,.55,.98,.68)
      ]
      loft("Hull port" if y>0 else "Hull starboard",sections,dark)
      # Deck-edge sheathing and carefully differentiated upper freeboard.
      sections2=[(x,Y,z+.66,w*.985,deck+.018,chine*.56) for (x,Y,z,w,deck,chine) in sections]
      loft("Sculpted white topside",sections2,white)
      # Long navy/blue belt line to anchor the silhouette.
      line("Crisp chine rubrail",( -4.90,y- .47,.50),(4.99,y-.54,.65),.031,accent)
      # Slim gunwale rails
      for sign in [-1,1]:
        rail_y=y+sign*.59
        line("Fore safety rail",(-4.25,rail_y,1.12),(-2.75,rail_y,1.14),.022,silver)
        line("Aft safety rail",(1.55,rail_y,1.12),(4.65,rail_y,1.15),.022,silver)
        for x in [-4.25,-3.5,-2.75,1.55,2.4,3.2,4.0,4.65]:
          if x in [-4.25,-3.5,-2.75,1.55,2.4,3.2,4.0,4.65]:
            line("Rail stanchion",(x,rail_y,.99),(x,rail_y,1.18),.014,silver)
      # Forward hatch plus smaller rear deck access.
      cube("Forward weatherproof hatch",(-3.95,y,1.02),(1.28,.80,.06),gunmetal,.045)
      cube("Hatch inlet",(-3.96,y,1.065),(.80,.52,.02),glass,.035)
      cube("Aft maintenance hatch",(3.55,y,1.03),(1.25,.86,.05),gunmetal,.034)
      cube("Aft hatch detailing",(3.55,y,1.061),(.89,.55,.012),silver,.018)
      # Portholes on outboard freeboard, translucent dark disks.
      for x in [-2.3,-1.45,2.5,3.40]:
        cylinder("Watertight side port",(x,y+(-.67 if y<0 else .67),.53),.075,.028,glass,vertices=24,rotation=(math.pi/2,0,0))
      # Stern propulsion shroud. Do not portray quantified engineering performance.
      cylinder("Illustrative drive shroud",(5.08,y,-.47),.28,.31,gunmetal,rotation=(0,math.pi/2,0))
      cylinder("Illustrative prop hub",(5.28,y,-.47),.10,.35,silver,rotation=(0,math.pi/2,0))
    # Connecting deck makes a structurally plausible twin-hull vessel
    cube("Main connecting bridge deck",(-.38,0,1.12),(7.0,3.9,.38),white,.13)
    cube("Bridge deck dark anti-slip walkway",(-2.2,0,1.33),(2.06,2.65,.035),gunmetal,.08)
    cube("Aft mission equipment deck",(2.15,0,1.34),(2.03,2.55,.06),gunmetal,.07)
    # Low-profile cabin front angled bow x negative. Six-sided envelope.
    cab_sections=[
      (-2.25,-.0,1.25,1.19,2.50,.34),
      (-1.70,-.0,1.25,1.46,2.98,.36),
      (.78,-.0,1.25,1.47,3.08,.36),
      (1.52,-.0,1.25,1.20,2.82,.36)
    ]
    loft("Panoramic wheelhouse",cab_sections,pearl)
    cube("Cabin roof with chamfer",(-.23,0,3.12),(3.17,2.88,.21),gunmetal,.11)
    cube("Cabin roof white top",(-.22,0,3.22),(3.08,2.80,.067),white,.08)
    # Wide uninterrupted tinted bridge windscreen and cheek windows
    frontglass=cube("Angular forward windscreen",(-1.87,0,2.50),(.065,2.48,.53),glass,.055)
    frontglass.rotation_euler[1]=-.22
    for side in [-1,1]:
      cube("Port or starboard pilothouse glazing",(-.28,side*1.45,2.46),(1.98,.05,.66),glass,.065)
      cube("Rear utility glazing",(1.31,side*1.17,2.42),(.18,.05,.56),glass,.025)
      # Thin frame dividers and windshield wipers
      for x in [-1.20,-.33,.52]:
        line("Window framing",(x,side*1.48,2.18),(x,side*1.48,2.80),.021,gunmetal)
      line("Windshield sill",(-1.9,side*1.21,2.20),(-1.9,0,2.20),.019,gunmetal)
    # Mast, radar dome, camera pod, slim antennas
    line("Radar mast core",(.24,0,3.24),(.24,0,4.31),.063,gunmetal)
    line("Radar support left",(.24,0,3.88),(-.28,-.42,3.32),.038,silver)
    line("Radar support right",(.24,0,3.88),(-.28,.42,3.32),.038,silver)
    cylinder("Radar radome base",(.24,0,4.34),.26,.13,gunmetal)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=18,radius=.28,location=(.24,0,4.61))
    bpy.context.object.name="Matte GNSS radar radome";bpy.context.object.data.materials.append(white)
    cube("Rear mast equipment box",(.72,.05,3.47),(.40,.53,.22),gunmetal,.02)
    line("VHF aerial",(1.02,-.55,3.29),(1.01,-.56,4.68),.013,gunmetal)
    line("VHF second aerial",(1.18,.60,3.29),(1.19,.62,4.44),.013,gunmetal)
    cylinder("Optical navigation camera",(-1.47,0,3.33),.15,.28,gunmetal)
    cylinder("Camera glass aperture",(-1.47,-.145,3.33),.067,.03,glass,rotation=(math.pi/2,0,0))
    cylinder("Roof navigation spotlight",(-1.12,-1.13,3.29),.1,.15,white)
    cylinder("Roof navigation spotlight",(-1.12,1.13,3.29),.1,.15,white)
    # Modular solar / non-slip equipment areas on aft connecting bridge
    for i in range(3):
      cube("Mission deck equipment panel",(2.36,i*.55-.55,1.41),(1.25,.42,.035),glass,.012)
    for x in [2.4,3.75]:
      cube("Deck handhold", (x,0,1.56),(.06,.62,.27),silver,.016)
    # Fine technical labeling with no invented dimensions
    for y in [-1.64,1.64]:
      cube("Courtesy navigation marker",(4.5,y,1.02),(.18,.23,.08),gold,.02)
    # Photo studio lighting with physical shadows, transparent background.
    world=bpy.context.scene.world;world.use_nodes=True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value=(.77,.85,.92,1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.55
    def area(name,location,power,size,color):
      datab=bpy.data.lights.new(name,"AREA");datab.energy=power;datab.shape="DISK";datab.size=size;datab.color=color
      ob=bpy.data.objects.new(name,datab);bpy.context.collection.objects.link(ob);ob.location=location
      direction=Vector((0,0,1.2))-ob.location
      ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    area("Large cool studio softbox",(-1.0,-7.5,11.5),2300,10,(.89,.94,1))
    area("Studio fill opposite",(0,8,8),1300,8,(.91,.96,1))
    area("Rim light stern",(8,1,10),1800,7,(1,.98,.93))
    # Orthographic product photography with credible perspective and zero fake scale
    bpy.ops.object.camera_add(location=(11.0,-14.5,10.8))
    cam=bpy.context.object;cam.name="Cinema product camera"
    target=Vector((0,0,1.22));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type="ORTHO";cam.data.ortho_scale=15.8
    scene=bpy.context.scene;scene.camera=cam
    scene.render.engine="CYCLES";scene.cycles.samples=30
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1720;scene.render.resolution_y=970
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=True
    scene.render.film_transparent_glass=True if hasattr(scene.render, "film_transparent_glass") else False
    scene.view_settings.view_transform='Standard'
    scene.view_settings.look='Medium High Contrast'
    scene.view_settings.exposure=0
    scene.view_settings.gamma=1.0
    scene.render.image_settings.color_depth="8"
    # CPU portability and reproducibility; images are artistic concept assets.
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.camera.data.lens=35
    return scene

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--output",required=True)
    args=p.parse_args(__import__('sys').argv[__import__('sys').argv.index('--')+1:])
    os.makedirs(args.output,exist_ok=True)
    for variant in ["reference","candidate"]:
      scene=build(variant)
      scene.render.filepath=os.path.abspath(os.path.join(args.output,"usv-"+variant+".png"))
      print("RENDERING "+scene.render.filepath,flush=True)
      bpy.ops.render.render(write_still=True)
      print("COMPLETE "+scene.render.filepath,flush=True)
if __name__=="__main__":main()
