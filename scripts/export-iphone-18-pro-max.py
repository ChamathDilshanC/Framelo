import bpy
import math

from mathutils import Vector

output = "C:/Users/chamm/Desktop/Framelo - Create. Animate. Showcase/public/devices/iphone-18-pro-max.glb"

# The source contains a presentation plane alongside the phone. Export only the
# actual model and keep the screen materials as named display candidates.
for obj in list(bpy.context.scene.objects):
    if obj.name != "Object_7":
        bpy.data.objects.remove(obj, do_unlink=True)

phone = bpy.context.scene.objects["Object_7"]
phone.rotation_euler.x = -math.pi / 2
bpy.context.view_layer.update()

height = phone.dimensions.y
phone.scale *= 3.0 / height
bpy.context.view_layer.update()

# Embed any images that are already available in the blend.
bpy.ops.file.pack_all()

bpy.ops.object.select_all(action="DESELECT")
phone.select_set(True)
bpy.context.view_layer.objects.active = phone
bpy.ops.export_scene.gltf(
    filepath=output,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
)
print("Exported", output)
