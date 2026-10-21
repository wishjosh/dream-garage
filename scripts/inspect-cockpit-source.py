"""Inspect a downloaded cockpit source without enabling its embedded scripts.
Run: blender --background --factory-startup --disable-autoexec --python scripts/inspect-cockpit-source.py -- source.blend output.json
This only reads the source; it does not save over it or execute its Text blocks.
"""
import bpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 2:
    raise SystemExit('Expected source.blend and output.json')
source, output = map(Path, args)
if source.resolve() == output.resolve() or output.suffix.lower() != '.json':
    raise SystemExit('Output must be a separate .json report, never the source file')
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()), load_ui=False, use_scripts=False)
def rounded(values):
    return [round(float(x), 6) for x in values]
objects = []
for obj in bpy.data.objects:
    record = {'name':obj.name, 'type':obj.type, 'parent':obj.parent.name if obj.parent else None,
              'location':rounded(obj.location), 'scale':rounded(obj.scale), 'rotation':rounded(obj.rotation_euler),
              'collections':[c.name for c in obj.users_collection]}
    if obj.type == 'MESH':
        corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
        record.update({'vertices':len(obj.data.vertices), 'polygons':len(obj.data.polygons),
                       'bounds':{'min':rounded(min(c[i] for c in corners) for i in range(3)),
                                 'max':rounded(max(c[i] for c in corners) for i in range(3))},
                       'materials':[mat.name if mat else None for mat in obj.data.materials],
                       'modifiers':[{'name':mod.name,'type':mod.type,'viewport':mod.show_viewport,'render':mod.show_render} for mod in obj.modifiers]})
    elif obj.type == 'CAMERA':
        record.update({'lens':obj.data.lens,'sensor_width':obj.data.sensor_width,
                       'matrix_world':[rounded(row) for row in obj.matrix_world]})
    objects.append(record)
report = {'source':source.name, 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
          'blender':bpy.app.version_string, 'units':bpy.context.scene.unit_settings.system,
          'scale_length':bpy.context.scene.unit_settings.scale_length,
          'objects':objects, 'texts':[{'name':text.name,'body':text.as_string()} for text in bpy.data.texts],
          'images':[{'name':image.name,'path':image.filepath,'packed':bool(image.packed_file)} for image in bpy.data.images]}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('SOURCE_INSPECTED',source.name,'objects',len(objects),'report',str(output))
