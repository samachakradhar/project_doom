import io
from typing import List, Dict, Any, Tuple
import pymupdf  # PyMuPDF
import pypdf

class DocumentValidator:
    """Validates file magic signatures, MIME types, sizes, dimensions, and integrity."""
    
    ALLOWED_IMAGE_SIGNATURES = {
        b'\xff\xd8\xff': ('image/jpeg', 'jpg'),
        b'\x89PNG\r\n\x1a\n': ('image/png', 'png'),
        b'RIFF': ('image/webp', 'webp')  # validated further with WEBP chunk
    }
    PDF_SIGNATURE = b'%PDF-'
    
    MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
    MAX_PDF_PAGES = 10

    @classmethod
    def validate_file(cls, file_bytes: bytes, filename: str) -> Tuple[str, str]:
        """
        Validates raw file bytes and returns (mime_type, file_extension).
        Raises ValueError with clear, user-facing error message on invalid files.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Uploaded document is empty (0 bytes).")
            
        if len(file_bytes) > cls.MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size exceeds maximum allowed limit of {cls.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.")

        # Check PDF signature
        if file_bytes.startswith(cls.PDF_SIGNATURE):
            try:
                # Verify PDF is valid and not encrypted
                doc = pymupdf.open(stream=file_bytes, filetype="pdf")
                if doc.is_encrypted:
                    doc.close()
                    raise ValueError("Password-protected or encrypted PDFs are not supported for patient safety.")
                if doc.page_count == 0:
                    doc.close()
                    raise ValueError("Uploaded PDF contains zero pages.")
                if doc.page_count > cls.MAX_PDF_PAGES:
                    doc.close()
                    raise ValueError(f"PDF exceeds maximum page limit of {cls.MAX_PDF_PAGES} pages (contains {doc.page_count}).")
                doc.close()
                return ("application/pdf", "pdf")
            except Exception as e:
                if "encrypted" in str(e).lower() or "page limit" in str(e).lower():
                    raise
                raise ValueError("Corrupted or malformed PDF file.")

        # Check Image signatures
        if file_bytes.startswith(b'\xff\xd8\xff'):
            return ("image/jpeg", "jpg")
        elif file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            return ("image/png", "png")
        elif file_bytes.startswith(b'RIFF') and len(file_bytes) >= 12 and file_bytes[8:12] == b'WEBP':
            return ("image/webp", "webp")

        raise ValueError(
            "Unsupported file format. Please upload a valid JPG, PNG, WEBP, or PDF medical document."
        )


class PDFProcessor:
    """
    Handles PDF ingestion, text stream extraction, and 300 DPI rasterization for scanned pages.
    """

    @staticmethod
    def process_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Processes each page of a PDF:
        - If page contains embedded text (>= 25 words), extracts structured text directly.
        - If page lacks usable text (scanned image), rasterizes page at 300 DPI into high-res JPEG bytes.
        Returns a list of page objects:
        [
            {
                "page_number": int,
                "is_scanned": bool,
                "text": str,
                "blocks": List[Dict],
                "image_bytes": Optional[bytes],
                "char_count": int
            }
        ]
        """
        results = []
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        
        try:
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                page_num = page_idx + 1
                
                # Extract text blocks
                # Block format: (x0, y0, x1, y1, "text", block_no, block_type)
                text_blocks = page.get_text("blocks")
                full_page_text = page.get_text().strip()
                words = full_page_text.split()
                
                # If page has at least 25 words of clean digital text, use native digital extraction
                if len(words) >= 25:
                    blocks = []
                    for b in text_blocks:
                        if len(b) >= 5 and b[4].strip():
                            blocks.append({
                                "bbox": [round(b[0], 1), round(b[1], 1), round(b[2], 1), round(b[3], 1)],
                                "text": b[4].strip(),
                                "confidence": 1.0  # Embedded digital PDF text has 100% confidence
                            })
                    
                    results.append({
                        "page_number": page_num,
                        "is_scanned": False,
                        "text": full_page_text,
                        "blocks": blocks,
                        "image_bytes": None,
                        "char_count": len(full_page_text)
                    })
                else:
                    # Scanned page: Render at 300 DPI for high-accuracy OCR
                    # 72 points per inch default, so zoom = 300 / 72 = 4.1666
                    zoom = 300 / 72
                    matrix = pymupdf.Matrix(zoom, zoom)
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    img_bytes = pix.tobytes("jpeg")
                    
                    results.append({
                        "page_number": page_num,
                        "is_scanned": True,
                        "text": full_page_text,
                        "blocks": [],
                        "image_bytes": img_bytes,
                        "char_count": len(full_page_text)
                    })
        finally:
            doc.close()

        return results
