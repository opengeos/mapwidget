#!/usr/bin/env python

"""Tests for `mapwidget` package."""


import json
import os
import tempfile
import unittest

from mapwidget.maplibre import Map


class TestMapLibreMap(unittest.TestCase):
    """Tests for the MapLibre Map widget."""

    def test_default_init(self):
        """Test default initialization."""
        m = Map()
        assert m.center == [0, 20]
        assert m.zoom == 2
        assert m.bearing == 0
        assert m.pitch == 0

    def test_custom_init(self):
        """Test initialization with custom parameters."""
        m = Map(center=[-77.03, 38.90], zoom=10, bearing=45, pitch=30)
        assert m.center == [-77.03, 38.90]
        assert m.zoom == 10
        assert m.bearing == 45
        assert m.pitch == 30

    def test_add_call(self):
        """Test add_call appends to calls list."""
        m = Map()
        m.add_call("setZoom", [5])
        assert len(m.calls) == 1
        assert m.calls[0]["method"] == "setZoom"
        assert m.calls[0]["args"] == [5]

    def test_set_center(self):
        """Test set_center adds a call."""
        m = Map()
        m.set_center(-77.03, 38.90)
        assert any(c["method"] == "setCenter" for c in m.calls)

    def test_set_zoom(self):
        """Test set_zoom adds a call."""
        m = Map()
        m.set_zoom(10)
        assert any(c["method"] == "setZoom" for c in m.calls)

    def test_fly_to(self):
        """Test fly_to adds a call."""
        m = Map()
        m.fly_to(center=[-77.03, 38.90], zoom=10)
        call = [c for c in m.calls if c["method"] == "flyTo"]
        assert len(call) == 1
        assert call[0]["args"][0]["center"] == [-77.03, 38.90]
        assert call[0]["args"][0]["zoom"] == 10

    def test_fit_bounds(self):
        """Test fit_bounds adds a call."""
        m = Map()
        m.fit_bounds([[-80, 35], [-75, 40]])
        assert any(c["method"] == "fitBounds" for c in m.calls)

    def test_add_source(self):
        """Test add_source adds a call."""
        m = Map()
        m.add_source("test-source", {"type": "geojson", "data": {}})
        call = [c for c in m.calls if c["method"] == "addSource"]
        assert len(call) == 1
        assert call[0]["args"][0] == "test-source"

    def test_add_layer(self):
        """Test add_layer adds a call."""
        m = Map()
        m.add_layer({"id": "test-layer", "type": "fill", "source": "test-source"})
        call = [c for c in m.calls if c["method"] == "addLayer"]
        assert len(call) == 1

    def test_remove_layer(self):
        """Test remove_layer adds a call."""
        m = Map()
        m.remove_layer("test-layer")
        assert any(c["method"] == "removeLayer" for c in m.calls)

    def test_add_control(self):
        """Test add_control appends to controls list."""
        m = Map()
        m.add_control("scale", "bottom-left")
        assert any(c["type"] == "scale" for c in m.controls)

    def test_set_paint_property(self):
        """Test set_paint_property adds a call."""
        m = Map()
        m.set_paint_property("layer-id", "fill-color", "#ff0000")
        call = [c for c in m.calls if c["method"] == "setPaintProperty"]
        assert len(call) == 1
        assert call[0]["args"] == ["layer-id", "fill-color", "#ff0000"]


class TestAddGeoJSON(unittest.TestCase):
    """Tests for the add_geojson method."""

    def test_add_geojson_dict_point(self):
        """Test adding a GeoJSON point dict."""
        m = Map()
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-77.03, 38.90]},
                    "properties": {"name": "DC"},
                }
            ],
        }
        source_id = m.add_geojson(geojson)
        assert source_id.startswith("geojson-")
        call = [c for c in m.calls if c["method"] == "addGeoJSON"]
        assert len(call) == 1

    def test_add_geojson_dict_polygon(self):
        """Test adding a GeoJSON polygon dict."""
        m = Map()
        geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [[-77, 38], [-76, 38], [-76, 39], [-77, 39], [-77, 38]]
                ],
            },
            "properties": {},
        }
        source_id = m.add_geojson(geojson, layer_type="fill")
        assert source_id.startswith("geojson-")

    def test_add_geojson_custom_ids(self):
        """Test adding GeoJSON with custom source and layer IDs."""
        m = Map()
        geojson = {
            "type": "FeatureCollection",
            "features": [],
        }
        source_id = m.add_geojson(geojson, source_id="my-source", layer_id="my-layer")
        assert source_id == "my-source"
        call = [c for c in m.calls if c["method"] == "addGeoJSON"]
        assert call[0]["args"][1] == "my-source"
        assert call[0]["args"][2] == "my-layer"

    def test_add_geojson_file(self):
        """Test adding GeoJSON from a file."""
        m = Map()
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                    "properties": {},
                }
            ],
        }
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".geojson", delete=False
        ) as f:
            json.dump(geojson, f)
            tmp_path = f.name

        try:
            source_id = m.add_geojson(tmp_path)
            assert source_id.startswith("geojson-")
            call = [c for c in m.calls if c["method"] == "addGeoJSON"]
            assert len(call) == 1
            # The data should be the loaded dict, not the file path
            assert call[0]["args"][0]["type"] == "FeatureCollection"
        finally:
            os.unlink(tmp_path)

    def test_add_geojson_url(self):
        """Test adding GeoJSON from a URL passes URL string through."""
        m = Map()
        url = "https://example.com/data.geojson"
        source_id = m.add_geojson(url)
        call = [c for c in m.calls if c["method"] == "addGeoJSON"]
        assert call[0]["args"][0] == url

    def test_add_geojson_bad_type(self):
        """Test that unsupported types raise TypeError."""
        m = Map()
        with self.assertRaises(TypeError):
            m.add_geojson(12345)

    def test_add_geojson_missing_file(self):
        """Test that a missing file raises FileNotFoundError."""
        m = Map()
        with self.assertRaises(FileNotFoundError):
            m.add_geojson("/nonexistent/path/data.geojson")

    def test_add_geojson_no_fit_bounds(self):
        """Test adding GeoJSON without fitting bounds."""
        m = Map()
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                    "properties": {},
                }
            ],
        }
        m.add_geojson(geojson, fit_bounds=False)
        call = [c for c in m.calls if c["method"] == "addGeoJSON"]
        # bounds arg should be None
        assert call[0]["args"][8] is None

    def test_add_geojson_custom_paint(self):
        """Test adding GeoJSON with custom paint properties."""
        m = Map()
        geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
            "properties": {},
        }
        paint = {"fill-color": "#ff0000", "fill-opacity": 0.3}
        m.add_geojson(geojson, paint=paint)
        call = [c for c in m.calls if c["method"] == "addGeoJSON"]
        assert call[0]["args"][4] == paint


class TestComputeBounds(unittest.TestCase):
    """Tests for _compute_geojson_bounds."""

    def test_point_bounds(self):
        """Test bounds computation for a point."""
        geojson = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-77.03, 38.90]},
            "properties": {},
        }
        bounds = Map._compute_geojson_bounds(geojson)
        assert bounds == [-77.03, 38.90, -77.03, 38.90]

    def test_polygon_bounds(self):
        """Test bounds computation for a polygon."""
        geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
            },
            "properties": {},
        }
        bounds = Map._compute_geojson_bounds(geojson)
        assert bounds == [0, 0, 10, 10]

    def test_feature_collection_bounds(self):
        """Test bounds computation for a FeatureCollection."""
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-10, -5]},
                    "properties": {},
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [10, 5]},
                    "properties": {},
                },
            ],
        }
        bounds = Map._compute_geojson_bounds(geojson)
        assert bounds == [-10, -5, 10, 5]

    def test_url_returns_none(self):
        """Test that a URL string returns None."""
        bounds = Map._compute_geojson_bounds("https://example.com/data.geojson")
        assert bounds is None

    def test_empty_features(self):
        """Test bounds for empty FeatureCollection."""
        geojson = {"type": "FeatureCollection", "features": []}
        bounds = Map._compute_geojson_bounds(geojson)
        assert bounds is None


class TestGetGeometryTypes(unittest.TestCase):
    """Tests for _get_geometry_types."""

    def test_point_type(self):
        """Test detecting Point geometry."""
        geojson = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {},
        }
        types = Map._get_geometry_types(geojson)
        assert types == {"Point"}

    def test_mixed_types(self):
        """Test detecting mixed geometry types."""
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                    "properties": {},
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
                    },
                    "properties": {},
                },
            ],
        }
        types = Map._get_geometry_types(geojson)
        assert types == {"Point", "Polygon"}

    def test_url_returns_empty(self):
        """Test that a URL returns empty set."""
        types = Map._get_geometry_types("https://example.com/data.geojson")
        assert types == set()


class TestAddCogLayer(unittest.TestCase):
    """Tests for the add_cog_layer method."""

    def test_add_cog_layer_default_ids(self):
        """Test adding COG layer with auto-generated IDs."""
        m = Map()
        m.add_cog_layer("https://example.com/data.tif")
        call = [c for c in m.calls if c["method"] == "addCogLayer"]
        assert len(call) == 1
        assert call[0]["args"][0] == "https://example.com/data.tif"

    def test_add_cog_layer_custom_ids(self):
        """Test adding COG layer with custom IDs."""
        m = Map()
        m.add_cog_layer(
            "https://example.com/data.tif",
            source_id="my-cog",
            layer_id="my-cog-layer",
        )
        call = [c for c in m.calls if c["method"] == "addCogLayer"]
        assert call[0]["args"][1] == "my-cog"
        assert call[0]["args"][2] == "my-cog-layer"


class TestAddStacLayer(unittest.TestCase):
    """Tests for the add_stac_layer method."""

    def test_add_stac_layer(self):
        """Test adding STAC layer generates correct call."""
        m = Map()
        m.add_stac_layer("https://example.com/stac/item.json", asset_key="visual")
        call = [c for c in m.calls if c["method"] == "addStacLayer"]
        assert len(call) == 1
        assert call[0]["args"][0] == "https://example.com/stac/item.json"
        assert call[0]["args"][1] == "visual"

    def test_add_stac_layer_custom_ids(self):
        """Test adding STAC layer with custom IDs."""
        m = Map()
        m.add_stac_layer(
            "https://example.com/stac/item.json",
            source_id="my-stac",
            layer_id="my-stac-layer",
        )
        call = [c for c in m.calls if c["method"] == "addStacLayer"]
        assert call[0]["args"][2] == "my-stac"
        assert call[0]["args"][3] == "my-stac-layer"


if __name__ == "__main__":
    unittest.main()
