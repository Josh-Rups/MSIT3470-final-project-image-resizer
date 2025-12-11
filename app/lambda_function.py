# app/lambda_function.py
import os
import json
import base64
import boto3
from PIL import Image
import io
import urllib.parse

s3 = boto3.client("s3")
OUTPUT_BUCKET = os.environ.get("OUTPUT_BUCKET")  # injected by Terraform

SIZE_MAP = {
    "small": (100, 100),
    "medium": (300, 300),
    "large": (600, 600),
}


def _response(status_code, body_dict):
    """Helper to add CORS headers to every response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",              # change to your domain later if you want
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body_dict),
    }


def lambda_handler(event, context):
    # Log once for debugging (optional, but useful)
    print("EVENT:", json.dumps(event))

    # Detect HTTP method (works for REST API or HTTP API)
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
    )

    # 1) Handle CORS preflight
    if method == "OPTIONS":
        # No body needed, just the headers so browser is happy
        return _response(204, {})

    try:
        # 2) Parse JSON body (API Gateway usually passes body as a JSON string)
        body_raw = event.get("body", "{}")
        if isinstance(body_raw, str):
            body = json.loads(body_raw)
        else:
            body = body_raw

        size_requested = body.get("size")
        filename = body.get("filename")
        image_b64 = body.get("file")

        if not size_requested or size_requested not in SIZE_MAP:
            return _response(400, {"error": "invalid or missing size"})

        if not filename or not image_b64:
            return _response(400, {"error": "missing filename or file"})

        # 3) Decode image
        image_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 4) Resize
        target = SIZE_MAP[size_requested]
        out = img.copy()
        out.thumbnail(target)

        # 5) Save to buffer as JPEG
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=85)
        buf.seek(0)

        # 6) Sanitize filename and create key
        safe_name = urllib.parse.quote_plus(filename)
        out_key = f"{size_requested}/{safe_name}"

        # 7) Upload to S3 (bucket is private; no ACL)
        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=out_key,
            Body=buf,
            ContentType="image/jpeg",
        )

        # 8) Generate a 1-hour presigned URL for the resized image
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": OUTPUT_BUCKET, "Key": out_key},
            ExpiresIn=3600,
        )

        return _response(200, {"message": "success", "url": url})

    except Exception as e:
        print("ERROR:", str(e))
        return _response(500, {"error": str(e)})
