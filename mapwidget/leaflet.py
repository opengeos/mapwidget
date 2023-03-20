import os
import pathlib
import anywidget
import traitlets


class Map(anywidget.AnyWidget):
    """Map widget

    Args:
        anywidget (_type_): _description_
    """

    _cwd = os.path.dirname(os.path.abspath(__file__))
    _esm = pathlib.Path(os.path.join(_cwd, 'javascript', 'leaflet.js'))
    _css = pathlib.Path(os.path.join(_cwd, 'styles', 'leaflet.css'))
    center = traitlets.List([40, -100]).tag(sync=True, o=True)
    zoom = traitlets.Int(4).tag(sync=True, o=True)
    bounds = traitlets.List([0, 0, 0, 0]).tag(sync=True, o=True)
    width = traitlets.Unicode('100%').tag(sync=True, o=True)
    height = traitlets.Unicode('600px').tag(sync=True, o=True)
    clicked_latlng = traitlets.List([None, None]).tag(sync=True, o=True)

    def add_layer(self, url=None):
        if url is None:
            url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'

        self.send({"type": "add_layer", "url": url, "attribution": "Google"})
