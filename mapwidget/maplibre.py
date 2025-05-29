import os
import uuid
import pathlib
import anywidget
import traitlets
from typing import Optional, Dict, Any


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

    # Draw-related traitlets
    draw_features_selected = traitlets.List(traitlets.Dict(), default_value=[]).tag(
        sync=True
    )
    draw_feature_collection_all = traitlets.Dict(
        default_value={"type": "FeatureCollection", "features": []}
    ).tag(sync=True)
    draw_features_created = traitlets.List(traitlets.Dict(), default_value=[]).tag(
        sync=True
    )
    draw_features_updated = traitlets.List(traitlets.Dict(), default_value=[]).tag(
        sync=True
    )
    draw_features_deleted = traitlets.List(traitlets.Dict(), default_value=[]).tag(
        sync=True
    )
    draw_repeat_mode = traitlets.Bool(False).tag(sync=True)

    def __init__(
        self,
        center=[0, 20],
        zoom=2,
        bearing=0,
        pitch=0,
        style="https://tiles.openfreemap.org/styles/liberty",
        controls=None,
        **kwargs,
    ):
        """Initialize the Map widget.

        Args:
            center: Initial center [lng, lat]. Defaults to [0, 20]
            zoom: Initial zoom level. Defaults to 2
            controls: List of controls to add by default. Defaults to ["navigation", "fullscreen", "globe"]
            **kwargs: Additional widget parameters
        """
        self._draw_control_request = None

        super().__init__(
            center=center,
            zoom=zoom,
            bearing=bearing,
            pitch=pitch,
            style=style,
            **kwargs,
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

        if self._draw_control_request:
            self.add_call("addDrawControl", self._draw_control_request)
            self._draw_control_request = None

        if hasattr(self, "_pending_draw_mode"):
            for mode in self._pending_draw_mode:
                self.add_call("setDrawMode", [mode])
            del self._pending_draw_mode

        if hasattr(self, "_pending_legend"):
            for targets, options, position in self._pending_legend:
                self.add_call("addLegendControl", [targets, options, position])
            del self._pending_legend

    @property
    def layers(self):
        """Get the current style of the map."""
        return self.root.get("layers", [])

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

    def add_draw_control(
        self,
        options: Optional[Dict[str, Any]] = None,
        controls: Optional[Dict[str, Any]] = None,
        position: str = "top-right",
        geojson: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        """
        Adds a drawing control to the map.

        This method enables users to add interactive drawing controls to the map,
        allowing for the creation, editing, and deletion of geometric shapes on
        the map. The options, position, and initial GeoJSON can be customized.

        Args:
            options (Optional[Dict[str, Any]]): Configuration options for the
                drawing control. Defaults to None.
            controls (Optional[Dict[str, Any]]): The drawing controls to enable.
                Can be one or more of the following: 'polygon', 'line_string',
                'point', 'trash', 'combine_features', 'uncombine_features'.
                Defaults to None.
            position (str): The position of the control on the map. Defaults
                to "top-right".
            geojson (Optional[Dict[str, Any]]): Initial GeoJSON data to load
                into the drawing control. Defaults to None.
            **kwargs (Any): Additional keyword arguments to be passed to the
                drawing control.

        Returns:
            None
        """
        if options is None:
            options = {}
        if controls is None:
            controls = {}

        # Merge kwargs into options
        options.update(kwargs)

        if self.loaded:
            self.add_call("addDrawControl", [options, controls, position, geojson])
        else:
            self._draw_control_request = [options, controls, position, geojson]

    def remove_draw_control(self) -> None:
        """
        Removes the drawing control from the map.

        This method removes the drawing control and clears all associated
        draw features from the map and model.

        Returns:
            None
        """
        self.add_call("removeDrawControl")

    def draw_features_delete_all(self) -> None:
        """
        Deletes all features from the drawing control.

        This method removes all drawn features from the map and updates
        the model accordingly.

        Returns:
            None
        """
        self.add_call("drawFeaturesDeleteAll")

    def add_legend(
        self,
        targets: Dict[str, str],
        options: Optional[Dict[str, Any]] = None,
        position: str = "top-right",
    ) -> None:
        """
        Adds a legend control to the map using mapbox-gl-legend plugin.

        Args:
            targets (Dict[str, str]): A dictionary mapping layer IDs to display names
            options (Optional[Dict[str, Any]]): Configuration options for the legend control.
                Available options:
                - showDefault (bool): Whether to show default legend. Defaults to False.
                - showCheckbox (bool): Whether to show checkboxes. Defaults to False.
                - onlyRendered (bool): Whether to show only rendered layers. Defaults to True.
                - reverseOrder (bool): Whether to reverse the order. Defaults to True.
            position (str): The position of the control on the map. Defaults to "top-right".

        Returns:
            None
        """
        if options is None:
            options = {
                "showDefault": False,
                "showCheckbox": False,
                "onlyRendered": True,
                "reverseOrder": True,
            }

        if self.loaded:
            self.add_call("addLegendControl", [targets, options, position])
        else:
            if not hasattr(self, "_pending_legend"):
                self._pending_legend = []
            self._pending_legend.append((targets, options, position))

    def set_draw_mode(self, mode: str):
        """Set the drawing mode, even if the map is not yet loaded."""
        if self.loaded:
            self.add_call("setDrawMode", [mode])
        else:
            if not hasattr(self, "_pending_draw_mode"):
                self._pending_draw_mode = []
            self._pending_draw_mode.append(mode)
