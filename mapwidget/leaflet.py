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

    def add_basemap(self, name, opacity=1.0, **kwargs):
        from .basemaps import get_xyz_dict

        xyz_tiles = get_xyz_dict()

        if name in xyz_tiles:
            url = xyz_tiles[name]['url']
            attribution = xyz_tiles[name]['attribution']
            max_zoom = xyz_tiles[name]['max_zoom']
            self.send(
                {
                    "type": "add_basemap",
                    "url": url,
                    "attribution": attribution,
                    "maxZoom": max_zoom,
                    "opacity": opacity,
                    "name": name,
                }
            )

        else:
            raise ValueError(
                f"Basemap {name} not found. It must be one of the following: {list(xyz_tiles.keys())}"
            )

    def add_layer(
        self, url, name='Layer', attribution='', max_zoom=24, opacity=1.0, **kwargs
    ):
        self.send(
            {
                "type": "add_layer",
                "url": url,
                "attribution": attribution,
                "maxZoom": max_zoom,
                "name": name,
                "opacity": opacity,
            }
        )
