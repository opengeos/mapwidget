import os
import pathlib
import anywidget
import traitlets


class Map(anywidget.AnyWidget):
    """Map widget

    Args:
        anywidget (_type_): _description_
    """

    cwd = os.path.dirname(os.path.abspath(__file__))
    _esm = pathlib.Path(os.path.join(cwd, 'javascript', 'openlayers.js'))
    _css = pathlib.Path(os.path.join(cwd, 'styles', 'openlayers.css'))
    center = traitlets.List([0, 20]).tag(sync=True, o=True)
    zoom = traitlets.Int(2).tag(sync=True, o=True)
    width = traitlets.Unicode('100%').tag(sync=True, o=True)
    height = traitlets.Unicode('500px').tag(sync=True, o=True)
