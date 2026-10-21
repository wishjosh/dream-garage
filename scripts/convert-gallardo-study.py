"""Convert the inspected Neubi Gallardo into a fixed-proportion spatial study.
Usage: blender -b --factory-startup --disable-autoexec --python scripts/convert-gallardo-study.py -- source.blend output_folder report.json
All imported geometry receives the same rigid transform and uniform scale.
"""
import bpy, sys, json, math, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
source,out,report_path=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()),load_ui=False,use_scripts=False)
scale=4.30/(4.697523-(-1.307124))
origin_y=1.91
# Blender Z-up -> glTF Y-up yields x=-source.x, y=source.z, z=source.y-origin_y.
common=Matrix.Translation((0,origin_y*scale,0)) @ Matrix.Rotation(math.pi,4,'Z') @ Matrix.Scale(scale,4)
def selected(o):
    return o.type=='MESH' and (o.name.startswith(('Amatur.','door','Karosse','Seat')) or o.name in ['Circle','Circle.003','Circle.004','Circle.005','Cube.001','Cube.002','Cube.003'] or (o.name.startswith('Plane') and o.name not in ['Plane.010','Plane.011','Plane.012']))
originals=[o for o in bpy.data.objects if selected(o)]
excluded=[o.name for o in bpy.data.objects if o.type=='MESH' and not selected(o)]
# Modest subdivision only for the few coarse original shell parts; most source
# interior objects have already been subdivided in the source file.
for o in originals:
    for mod in o.modifiers:
        if mod.type=='SUBSURF': mod.levels=min(mod.levels,1);mod.render_levels=mod.levels
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
neutral={}
def material(name):
    if name in neutral:return neutral[name]
    low=name.lower()
    if low in ['glass','rear_glass','glass_rear','blinker_glas']: color=(.31,.38,.40,0.035);rough=.12;metal=0
    elif 'leder_yellow' in low: color=(.30,.32,.33,1);rough=.9;metal=0
    elif 'leder_black' in low or low=='plastic': color=(.065,.075,.082,1);rough=.83;metal=0
    elif low=='velvet': color=(.18,.20,.21,1);rough=1;metal=0
    elif 'chrome' in low or 'mirrow' in low or low=='rim': color=(.38,.42,.44,1);rough=.36;metal=.35
    elif low.startswith('emit_'): color=(.33,.38,.40,1);rough=.6;metal=0
    elif 'board' in low: color=(.015,.022,.025,1);rough=.65;metal=0
    elif low in ['lack','black_coat']: color=(.23,.26,.28,1);rough=.65;metal=.1
    else: color=(.18,.20,.22,1);rough=.8;metal=0
    m=bpy.data.materials.new('study_'+name);m.use_nodes=True;m.diffuse_color=color
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=color[3]
    m.use_backface_culling=False
    if color[3]<1:m.surface_render_method='DITHERED'
    neutral[name]=m;return m
collection=bpy.data.collections.new('SpatialStudyExport');bpy.context.scene.collection.children.link(collection)
converted=[];records=[]
for original in originals:
    evaluated=original.evaluated_get(deps)
    mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
    if not mesh.vertices:
        excluded.append(original.name+' (empty evaluated mesh)');bpy.data.meshes.remove(mesh);continue
    # Capture world geometry before converting; bounding boxes below are actual
    # evaluated vertices, unlike the conservative raw object bound_box.
    source_points=[evaluated.matrix_world @ v.co for v in mesh.vertices]
    mesh.transform(common @ evaluated.matrix_world)
    obj=bpy.data.objects.new('source_'+original.name,mesh);collection.objects.link(obj)
    old_materials=list(mesh.materials);material_indices=[p.material_index for p in mesh.polygons];mesh.materials.clear()
    for m in old_materials:mesh.materials.append(material(m.name if m else 'neutral'))
    if not old_materials:mesh.materials.append(material('neutral'))
    for polygon,index in zip(mesh.polygons,material_indices):polygon.material_index=index
    # High-density tiny HVAC/display details get a geometry-only reduction.
    # Never resize a component to fit the viewport.
    ratio={'Plane':.18,'Plane.001':.04,'Plane.003':.08,'Plane.004':.12,'Amatur.002':.22,'Plane.005':.45,'Seat.002':.40,'Seat.004':.40,'Circle.003':.40}.get(original.name)
    if ratio:
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        dec=obj.modifiers.new('mobile_detail_reduction','DECIMATE');dec.ratio=ratio
        bpy.ops.object.modifier_apply(modifier=dec.name);obj.select_set(False)
    for p in obj.data.polygons:p.use_smooth=True
    def bounds(points):return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
    records.append({'source':original.name,'node':obj.name,'sourceBounds':bounds(source_points),'blenderOutputBounds':bounds([v.co for v in obj.data.vertices]),'decimateRatio':ratio,'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons)})
    converted.append(obj)
# Only the converted, unparented collection is exported. Cameras, lights,
# embedded scripts, textures, source scene and exterior wheels are excluded.
for o in bpy.context.selected_objects:o.select_set(False)
for o in converted:o.hide_set(False);o.hide_viewport=False;o.hide_render=False;o.select_set(True)
out.mkdir(parents=True,exist_ok=True)
bpy.context.view_layer.objects.active=converted[0]
bpy.ops.export_scene.gltf(filepath=str(out/'gallardo-interior.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=False,export_yup=True)
manifest={'schema':1,'sourceInspected':True,'asset':'gallardo-interior.glb','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'eye':[-.558003*scale,1.43*scale,0],'forward':[0,0,-1],'provenance':{'label':'Gallardo 원본 실내 · Neubi / Neubi3D','source':'https://blendswap.com/blend/8686','license':'CC BY-SA 3.0; source Fan Art noncommercial notice retained','licenseUrl':'https://creativecommons.org/licenses/by-sa/3.0/','changes':'Common uniform scale/axis transform; neutral materials; reduced small control meshes; no original textures. Spatial prototype only.'}}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report={'source':source.name,'sourceSha256':manifest['sourceSha256'],'scale':scale,'sourceOriginY':origin_y,'transform':'glTF (-x*s, z*s, (y-1.91)*s)','referenceLengthMeters':4.3,'scaleNote':'Game study scale convention, not a claim of surveyed original accuracy','eyeSource':[.558003,1.91,1.43],'objects':records,'excluded':excluded,'assetBytes':(out/'gallardo-interior.glb').stat().st_size}
report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('STUDY_EXPORT',len(converted),'objects',report['assetBytes'],'bytes','scale',scale)
