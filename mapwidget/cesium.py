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
    _esm = pathlib.Path(os.path.join(cwd, 'javascript', 'cesium.js'))
    _css = pathlib.Path(os.path.join(cwd, 'styles', 'cesium.css'))
    default_token = os.environ.get('CESIUM_TOKEN')
    token = traitlets.Unicode(default_token).tag(sync=True)
