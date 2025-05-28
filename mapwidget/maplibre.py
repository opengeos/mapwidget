import os
import uuid
import pathlib
import anywidget
import traitlets


class Map(anywidget.AnyWidget):
    """Create a MapLibre map widget."""

    _cwd = os.path.dirname(os.path.abspath(__file__))
    _esm = pathlib.Path(os.path.join(_cwd, "js", "maplibre.js"))
    _css = pathlib.Path(os.path.join(_cwd, "css", "maplibre.css"))
    center = traitlets.List([0, 20]).tag(sync=True, o=True)
    zoom = traitlets.Float(2).tag(sync=True, o=True)
    bounds = traitlets.List([0, 0, 0, 0]).tag(sync=True, o=True)
    width = traitlets.Unicode("100%").tag(sync=True, o=True)
    height = traitlets.Unicode("600px").tag(sync=True, o=True)
    clicked_latlng = traitlets.List([None, None]).tag(sync=True, o=True)
    calls = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True, o=True)
    query_result = traitlets.Dict(default_value={}).tag(sync=True, o=True)
    call_results = traitlets.Dict(default_value={}).tag(sync=True, o=True)
    view_state = traitlets.Dict().tag(sync=True)

    def add_call(self, method: str, args: list = None, kwargs: dict = None):
        """Invoke a JS map method with arguments."""
        if args is None:
            args = []
        if kwargs is None:
            kwargs = {}
        self.calls = self.calls + [{"method": method, "args": args, "kwargs": kwargs}]

    def call_and_return(self, method: str, args: list = None) -> str:
        """Call a JS method and receive the result via call_results."""
        if args is None:
            args = []
        call_id = str(uuid.uuid4())
        self.calls = self.calls + [
            {"method": method, "args": args, "returnResult": True, "call_id": call_id}
        ]
        return call_id

    def query(self, method: str, args: list = None):
        """Request data from the JS map and return via `result` trait."""
        if args is None:
            args = []
        self.calls = self.calls + [{"method": method, "args": args, "return": True}]

    def set_center(self, lng: float, lat: float):
        """Set the center of the map."""
        self.add_call("setCenter", [[lng, lat]])

    def set_zoom(self, zoom: float):
        """Set the zoom level."""
        self.add_call("setZoom", [zoom])

    def pan_to(self, lng: float, lat: float):
        """Pan the map to a given location."""
        self.add_call("panTo", [[lng, lat]])

    def fly_to(self, center=None, zoom=None, bearing=None, pitch=None):
        """Fly to a given location with optional zoom, bearing, and pitch."""
        options = {}
        if center:
            options["center"] = center
        if zoom is not None:
            options["zoom"] = zoom
        if bearing is not None:
            options["bearing"] = bearing
        if pitch is not None:
            options["pitch"] = pitch
        self.add_call("flyTo", [options])

    def fit_bounds(self, bounds: list, options: dict = None):
        """Fit the map to given bounds [[west, south], [east, north]]."""
        args = [bounds]
        if options:
            args.append(options)
        self.add_call("fitBounds", args)

    def set_pitch(self, pitch: float):
        """Set the pitch of the map."""
        self.add_call("setPitch", [pitch])

    def set_bearing(self, bearing: float):
        """Set the bearing of the map."""
        self.add_call("setBearing", [bearing])

    def resize(self):
        """Trigger map resize."""
        self.add_call("resize")

    def add_source(self, source_id: str, source: dict):
        """Add a new source to the map."""
        self.add_call("addSource", [source_id, source])

    def remove_source(self, source_id: str):
        """Remove a source from the map."""
        self.add_call("removeSource", [source_id])

    def add_layer(self, layer: dict, before_id: str = None):
        """Add a new layer to the map."""
        args = [layer]
        if before_id:
            args.append(before_id)
        self.add_call("addLayer", args)

    def remove_layer(self, layer_id: str):
        """Remove a layer from the map."""
        self.add_call("removeLayer", [layer_id])

    def set_paint_property(self, layer_id: str, prop: str, value):
        """Set a paint property on a layer."""
        self.add_call("setPaintProperty", [layer_id, prop, value])

    def set_layout_property(self, layer_id: str, prop: str, value):
        """Set a layout property on a layer."""
        self.add_call("setLayoutProperty", [layer_id, prop, value])

    def set_filter(self, layer_id: str, filter_expr):
        """Set a filter expression on a layer."""
        self.add_call("setFilter", [layer_id, filter_expr])

    def set_style(self, style_url: str):
        """Set the map style."""
        self.add_call("setStyle", [style_url])

    def set_layer_visibility(self, layer_id: str, visibility: str):
        """Set visibility of a layer ('visible' or 'none')."""
        self.set_layout_property(layer_id, "visibility", visibility)
