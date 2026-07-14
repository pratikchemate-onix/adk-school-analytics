"""Unit tests for the _strip_code_parts after_model_callback."""

from unittest.mock import MagicMock

from app.agent import _strip_code_parts


def _make_response(parts):
    """Build a minimal fake LlmResponse with the given parts list."""
    response = MagicMock()
    response.content = MagicMock()
    response.content.parts = list(parts)
    return response


def _text_part(text):
    p = MagicMock()
    p.text = text
    p.executable_code = None
    p.code_execution_result = None
    p.inline_data = None
    return p


def _code_part():
    p = MagicMock()
    p.text = None
    p.executable_code = MagicMock()
    p.code_execution_result = None
    p.inline_data = None
    return p


def _exec_result_part():
    p = MagicMock()
    p.text = None
    p.executable_code = None
    p.code_execution_result = MagicMock()
    p.inline_data = None
    return p


def _image_part(mime_type="image/png"):
    p = MagicMock()
    p.text = None
    p.executable_code = None
    p.code_execution_result = None
    p.inline_data = MagicMock()
    p.inline_data.mime_type = mime_type
    return p


class TestStripCodeParts:
    def test_none_content_returns_none(self):
        response = MagicMock()
        response.content = None
        assert _strip_code_parts(MagicMock(), response) is None

    def test_empty_parts_returns_none(self):
        response = _make_response([])
        assert _strip_code_parts(MagicMock(), response) is None

    def test_returns_none_always(self):
        response = _make_response([_text_part("hello")])
        result = _strip_code_parts(MagicMock(), response)
        assert result is None

    def test_executable_code_stripped(self):
        response = _make_response([_text_part("before"), _code_part(), _text_part("after")])
        _strip_code_parts(MagicMock(), response)
        texts = [p.text for p in response.content.parts if p.text]
        assert texts == ["before", "after"]
        assert len(response.content.parts) == 2

    def test_code_execution_result_stripped(self):
        response = _make_response([_exec_result_part(), _text_part("result")])
        _strip_code_parts(MagicMock(), response)
        assert len(response.content.parts) == 1
        assert response.content.parts[0].text == "result"

    def test_only_last_image_kept(self):
        img1 = _image_part()
        img2 = _image_part()
        response = _make_response([_text_part("t"), img1, img2])
        _strip_code_parts(MagicMock(), response)
        images = [p for p in response.content.parts if p.inline_data]
        assert len(images) == 1
        assert images[0] is img2

    def test_text_after_image_gets_newline(self):
        img = _image_part()
        follow = _text_part("interpretation")
        response = _make_response([img, follow])
        _strip_code_parts(MagicMock(), response)
        last_text = response.content.parts[-1].text
        assert last_text.startswith("\n\n")

    def test_no_image_no_newline_prepended(self):
        t = _text_part("just text")
        response = _make_response([t])
        _strip_code_parts(MagicMock(), response)
        assert response.content.parts[0].text == "just text"

    def test_none_mime_type_does_not_raise(self):
        img = _image_part(mime_type=None)
        response = _make_response([_text_part("t"), img])
        # Must not raise AttributeError
        _strip_code_parts(MagicMock(), response)
        # The None-mime_type part is not treated as an image, so it is kept as-is
        assert any(p.inline_data is not None for p in response.content.parts)
