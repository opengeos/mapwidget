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
    bearing = traitlets.Float(0).tag(sync=True, o=True)
    pitch = traitlets.Float(0).tag(sync=True, o=True)
    bounds = traitlets.List([0, 0, 0, 0]).tag(sync=True, o=True)
    width = traitlets.Unicode("100%").tag(sync=True, o=True)
    height = traitlets.Unicode("600px").tag(sync=True, o=True)
    clicked_latlng = traitlets.List([None, None]).tag(sync=True, o=True)
    calls = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True, o=True)
    view_state = traitlets.Dict().tag(sync=True)
    root = traitlets.Dict().tag(sync=True)
    sources = traitlets.Dict().tag(sync=True)
    loaded = traitlets.Bool(False).tag(sync=True)
    controls = traitlets.List(traitlets.Dict(), default_value=[]).tag(sync=True, o=True)
    style = traitlets.Any().tag(sync=True)

    def __init__(
        self,
        center=[0, 20],
        zoom=2,
        bearing=0,
        pitch=0,
        style="https://tiles.openfreemap.org/styles/liberty",
        controls=None,
        **kwargs
    ):
        """Initialize the Map widget.

        Args:
            center: Initial center [lng, lat]. Defaults to [0, 20]
            zoom: Initial zoom level. Defaults to 2
            controls: List of controls to add by default. Defaults to ["navigation", "fullscreen", "globe"]
            **kwargs: Additional widget parameters
        """
        super().__init__(
            center=center,
            zoom=zoom,
            bearing=bearing,
            pitch=pitch,
            style=style,
            **kwargs
        )

        # Store default controls to add after initialization
        self._default_controls = (
            controls if controls is not None else ["navigation", "fullscreen", "globe"]
        )

        # Add default controls after widget is ready
        self.observe(self._add_default_controls, names="loaded")

    def _add_default_controls(self, change):
        """Add default controls when the map is loaded."""
        if change["new"] and self._default_controls:
            for control in self._default_controls:
                self.add_control(control, "top-right")
            self._default_controls = []  # Clear to avoid re-adding

    @property
    def layers(self):
        """Get the current style of the map."""
        return self.style.get("layers", [])

    @property
    def layer_names(self):
        """Get the names of the layers in the map."""
        return [layer["id"] for layer in self.layers]

    def add_call(self, method: str, args: list = None, kwargs: dict = None):
        """Invoke a JS map method with arguments."""
        if args is None:
            args = []
        if kwargs is None:
            kwargs = {}
        self.calls = self.calls + [{"method": method, "args": args, "kwargs": kwargs}]

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

    def add_control(
        self, control_type: str, position: str = "top-right", options: dict = None
    ):
        """Add a control to the map.

        Args:
            control_type: Type of control to add. Options include:
                - 'navigation' or 'NavigationControl'
                - 'geolocate' or 'GeolocateControl'
                - 'scale' or 'ScaleControl'
                - 'fullscreen' or 'FullscreenControl'
                - 'attribution' or 'AttributionControl'
                - 'globe' or 'GlobeControl'
                - 'logo' or 'LogoControl'
                - 'terrain' or 'TerrainControl'
            position: Position on the map. Options: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
            options: Optional configuration for the control
        """
        if options is None:
            options = {}
        self.add_call("addControl", [control_type, position, options])
        self.controls.append(
            {"type": control_type, "position": position, "options": options}
        )

    def remove_control(self, control_type: str):
        """Remove a control from the map.

        Args:
            control_type: The type of control to remove (e.g., 'navigation', 'fullscreen')
        """
        self.add_call("removeControl", [control_type])
        self.controls = [
            control for control in self.controls if control["type"] != control_type
        ]
