"""Flask routes for WhiteBooks GST integration."""

from __future__ import annotations

from flask import jsonify, make_response, request, session

from gst.logger import fetch_recent_gst_api_logs
from gst.public_api import search_hsn, verify_gstin
from gst.whitebooks_client import WhiteBooksApiError, WhiteBooksAuthError, get_whitebooks_client


def _require_login_json():
    user_email = session.get("user")
    if not user_email:
        return None, jsonify({"success": False, "message": "Session expired"}), 401
    return user_email, None, None


def _gst_client_for_request():
    client = get_whitebooks_client()
    client.set_log_context(
        user_email=session.get("user"),
        company_code=session.get("company_code"),
    )
    return client


def register_gst_routes(app):
    """Attach GST routes to the Flask app."""

    @app.route("/api/gst/health", methods=["GET"])
    def api_gst_health():
        """Configuration check only — does not call WhiteBooks."""
        client = _gst_client_for_request()
        return jsonify({"success": True, "gst": client.get_config_status()}), 200

    @app.route("/api/gst/auth/test", methods=["GET", "POST"])
    def api_gst_auth_test():
        """Authenticate against WhiteBooks sandbox and return token preview."""
        user_email, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        force = request.args.get("force", "").strip().lower() in ("1", "true", "yes")
        client = _gst_client_for_request()

        try:
            result = client.authenticate(force_refresh=force)
        except WhiteBooksAuthError as exc:
            return jsonify({
                "success": False,
                "message": str(exc),
                "gst": client.get_config_status(),
            }), 502

        http_code = 200 if result.get("success") else 400
        payload = {
            "success": bool(result.get("success")),
            "gst": client.get_config_status(),
            "auth": {k: v for k, v in result.items() if k != "auth_token"},
        }
        if result.get("success"):
            payload["auth"]["token_preview"] = result.get("token_preview")
            payload["auth"]["token_obtained"] = bool(result.get("auth_token"))
            if result.get("token_source"):
                payload["auth"]["token_source"] = result.get("token_source")
            if result.get("expires_at"):
                payload["auth"]["expires_at"] = result.get("expires_at")
        else:
            payload["message"] = result.get("message")
            if result.get("missing"):
                payload["missing"] = result["missing"]
            if result.get("hint"):
                payload["hint"] = result["hint"]

        return jsonify(payload), http_code

    @app.route("/api/gst/logs", methods=["GET"])
    def api_gst_logs():
        """Recent WhiteBooks API call logs (auth + api_call)."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        try:
            limit = int(request.args.get("limit") or 20)
        except (TypeError, ValueError):
            limit = 20

        try:
            rows = fetch_recent_gst_api_logs(limit=limit)
        except Exception as exc:
            return jsonify({"success": False, "message": str(exc)}), 500

        return jsonify({"success": True, "logs": rows, "count": len(rows)}), 200

    @app.route("/api/gst/call", methods=["POST"])
    def api_gst_call():
        """
        Generic WhiteBooks API proxy for Phase 1 testing.
        Body: { "method": "GET", "path": "/some/api", "params": {}, "json": {} }
        """
        user_email, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        body = request.get_json(silent=True) or {}
        path = (body.get("path") or "").strip()
        if not path:
            return jsonify({"success": False, "message": "path is required"}), 400

        method = (body.get("method") or "GET").strip().upper()
        client = _gst_client_for_request()

        try:
            result = client.api_call(
                method,
                path,
                params=body.get("params"),
                json_body=body.get("json"),
                data=body.get("data"),
            )
        except WhiteBooksApiError as exc:
            return jsonify({
                "success": False,
                "message": str(exc),
                "log_id": exc.log_id,
                "response": exc.response,
            }), 502

        status = 200 if result.get("success") else 400
        return jsonify({"success": bool(result.get("success")), "result": result}), status

    @app.route("/api/gst/verify-gstin", methods=["GET"])
    def api_gst_verify_gstin():
        """Verify a GSTIN against WhiteBooks public taxpayer search."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        gstin = (request.args.get("gstin") or "").strip()
        if not gstin:
            return jsonify({"success": False, "message": "gstin query parameter is required"}), 400

        client = _gst_client_for_request()
        try:
            result = verify_gstin(client, gstin)
        except WhiteBooksAuthError as exc:
            return jsonify({"success": False, "message": str(exc)}), 502

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    @app.route("/api/gst/hsn", methods=["GET"])
    def api_gst_hsn():
        """Validate HSN code format and optionally query WhiteBooks HSN API."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        query = (request.args.get("q") or request.args.get("hsn") or "").strip()
        if not query:
            return jsonify({"success": False, "message": "q (or hsn) query parameter is required"}), 400

        client = _gst_client_for_request()
        try:
            result = search_hsn(client, query)
        except WhiteBooksAuthError as exc:
            return jsonify({"success": False, "message": str(exc)}), 502

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    @app.route("/api/gst/einvoice/status", methods=["GET"])
    def api_gst_einvoice_status():
        """Return stored IRN / e-Invoice fields for an invoice or quick bill."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        invoice_id = (request.args.get("invoice_id") or "").strip()
        bill_id_raw = (request.args.get("bill_id") or "").strip()

        from app import get_db_connection
        from gst.einvoice_schema import ensure_einvoice_schema

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            ensure_einvoice_schema(cur)
            conn.commit()

            if bill_id_raw:
                try:
                    bill_id = int(bill_id_raw)
                except ValueError:
                    return jsonify({"success": False, "message": "bill_id must be an integer"}), 400
                cur.execute(
                    """
                    SELECT id, irn, ack_no, ack_date, einvoice_status, signed_qr,
                           customer_name, buyer_gstin
                    FROM quick_bills
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (bill_id,),
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "message": "Quick bill not found"}), 404
                ack_date = row[3]
                return jsonify({
                    "success": True,
                    "bill_id": row[0],
                    "irn": row[1] or "",
                    "ack_no": row[2] or "",
                    "ack_date": ack_date.isoformat() if hasattr(ack_date, "isoformat") else (str(ack_date) if ack_date else ""),
                    "einvoice_status": row[4] or "",
                    "signed_qr": row[5] or "",
                    "customer_name": row[6] or "",
                    "buyer_gstin": row[7] or "",
                    "has_irn": bool((row[1] or "").strip()),
                }), 200

            if not invoice_id:
                return jsonify({"success": False, "message": "invoice_id or bill_id is required"}), 400

            cur.execute(
                """
                SELECT invoice_id, irn, ack_no, ack_date, einvoice_status, signed_qr, status
                FROM invoices
                WHERE invoice_id = %s
                LIMIT 1
                """,
                (invoice_id,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Invoice not found"}), 404
            ack_date = row[3]
            return jsonify({
                "success": True,
                "invoice_id": row[0],
                "irn": row[1] or "",
                "ack_no": row[2] or "",
                "ack_date": ack_date.isoformat() if hasattr(ack_date, "isoformat") else (str(ack_date) if ack_date else ""),
                "einvoice_status": row[4] or "",
                "signed_qr": row[5] or "",
                "invoice_status": row[6] or "",
                "has_irn": bool((row[1] or "").strip()),
            }), 200
        finally:
            cur.close()
            conn.close()

    @app.route("/api/gst/einvoice/generate", methods=["POST"])
    def api_gst_einvoice_generate():
        """Generate e-Invoice IRN for a sales invoice or quick bill via WhiteBooks."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        body = request.get_json(silent=True) or {}
        invoice_id = (body.get("invoice_id") or request.args.get("invoice_id") or "").strip()
        bill_id_raw = body.get("bill_id") or request.args.get("bill_id")

        from app import get_db_connection
        from gst.einvoice_service import generate_invoice_irn, generate_quick_bill_irn

        client = _gst_client_for_request()
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            if bill_id_raw not in (None, ""):
                try:
                    bill_id = int(bill_id_raw)
                except (TypeError, ValueError):
                    return jsonify({"success": False, "message": "bill_id must be an integer"}), 400
                result = generate_quick_bill_irn(
                    client,
                    cur,
                    conn,
                    bill_id,
                    company_code=session.get("company_code"),
                )
            elif invoice_id:
                result = generate_invoice_irn(
                    client,
                    cur,
                    conn,
                    invoice_id,
                    company_code=session.get("company_code"),
                )
            else:
                return jsonify({"success": False, "message": "invoice_id or bill_id is required"}), 400
        except Exception as exc:
            conn.rollback()
            return jsonify({"success": False, "message": str(exc)}), 500
        finally:
            cur.close()
            conn.close()

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    @app.route("/api/gst/einvoice/details", methods=["GET"])
    def api_gst_einvoice_details():
        """Return stored e-Invoice fields; optional refresh from WhiteBooks by IRN."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        invoice_id = (request.args.get("invoice_id") or "").strip()
        bill_id_raw = (request.args.get("bill_id") or "").strip()
        refresh = (request.args.get("refresh") or "").strip().lower() in ("1", "true", "yes")

        from app import get_db_connection
        from gst.einvoice_service import get_einvoice_details

        client = _gst_client_for_request()
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            if bill_id_raw:
                try:
                    bill_id = int(bill_id_raw)
                except ValueError:
                    return jsonify({"success": False, "message": "bill_id must be an integer"}), 400
                result = get_einvoice_details(
                    client, cur, conn, bill_id=bill_id, refresh=refresh,
                )
            elif invoice_id:
                result = get_einvoice_details(
                    client, cur, conn, invoice_id=invoice_id, refresh=refresh,
                )
            else:
                return jsonify({"success": False, "message": "invoice_id or bill_id is required"}), 400
        except Exception as exc:
            conn.rollback()
            return jsonify({"success": False, "message": str(exc)}), 500
        finally:
            cur.close()
            conn.close()

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    @app.route("/api/gst/einvoice/cancel", methods=["POST"])
    def api_gst_einvoice_cancel():
        """Cancel an e-Invoice IRN for a sales invoice or quick bill."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        body = request.get_json(silent=True) or {}
        invoice_id = (body.get("invoice_id") or request.args.get("invoice_id") or "").strip()
        bill_id_raw = body.get("bill_id") or request.args.get("bill_id")
        reason = str(body.get("cancel_reason") or body.get("CnlRsn") or "3").strip()[:1]
        remarks = str(body.get("remarks") or body.get("CnlRem") or "").strip()[:100]

        from app import get_db_connection
        from gst.einvoice_service import cancel_einvoice_irn

        client = _gst_client_for_request()
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            if bill_id_raw not in (None, ""):
                try:
                    bill_id = int(bill_id_raw)
                except (TypeError, ValueError):
                    return jsonify({"success": False, "message": "bill_id must be an integer"}), 400
                result = cancel_einvoice_irn(
                    client, cur, conn,
                    bill_id=bill_id,
                    reason=reason,
                    remarks=remarks,
                )
            elif invoice_id:
                result = cancel_einvoice_irn(
                    client, cur, conn,
                    invoice_id=invoice_id,
                    reason=reason,
                    remarks=remarks,
                )
            else:
                return jsonify({"success": False, "message": "invoice_id or bill_id is required"}), 400
        except Exception as exc:
            conn.rollback()
            return jsonify({"success": False, "message": str(exc)}), 500
        finally:
            cur.close()
            conn.close()

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    @app.route("/api/gst/einvoice/qr", methods=["GET"])
    def api_gst_einvoice_qr():
        """PNG QR code for stored signed QR (or IRN fallback)."""
        _user, resp, code = _require_login_json()
        if resp is not None:
            return resp, code

        invoice_id = (request.args.get("invoice_id") or "").strip()
        bill_id_raw = (request.args.get("bill_id") or "").strip()

        from app import get_db_connection
        from gst.einvoice_qr import build_qr_png_bytes
        from gst.einvoice_service import load_invoice_einvoice_record, load_quick_bill_einvoice_record

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            if bill_id_raw:
                try:
                    bill_id = int(bill_id_raw)
                except ValueError:
                    return jsonify({"success": False, "message": "bill_id must be an integer"}), 400
                record = load_quick_bill_einvoice_record(cur, bill_id)
            elif invoice_id:
                record = load_invoice_einvoice_record(cur, invoice_id)
            else:
                return jsonify({"success": False, "message": "invoice_id or bill_id is required"}), 400
        finally:
            cur.close()
            conn.close()

        if not record:
            return jsonify({"success": False, "message": "Document not found"}), 404

        qr_text = (record.get("signed_qr") or record.get("irn") or "").strip()
        if not qr_text:
            return jsonify({"success": False, "message": "No IRN / signed QR available"}), 404

        png = build_qr_png_bytes(qr_text)
        if not png:
            return jsonify({
                "success": False,
                "message": "QR rendering unavailable (install qrcode and Pillow).",
            }), 503

        response = make_response(png)
        response.headers["Content-Type"] = "image/png"
        response.headers["Cache-Control"] = "private, max-age=300"
        return response
