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
    _esm = pathlib.Path(os.path.join(cwd, 'javascript', 'mapbox.js'))
    _css = pathlib.Path(os.path.join(cwd, 'styles', 'mapbox.css'))
    default_token = os.environ.get('MAPBOX_TOKEN')
    token = traitlets.Unicode(default_token).tag(sync=True)
    center = traitlets.List([0, 20]).tag(sync=True, o=True)
    zoom = traitlets.Int(2).tag(sync=True, o=True)
    width = traitlets.Unicode('100%').tag(sync=True, o=True)
    height = traitlets.Unicode('300px').tag(sync=True, o=True)
