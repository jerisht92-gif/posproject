import io
import os
import uuid

from dotenv import load_dotenv

import object_storage


class _FileLike:
    def __init__(self, data: bytes) -> None:
        self.stream = io.BytesIO(data)

    def read(self) -> bytes:
        return self.stream.read()


def main() -> int:
    load_dotenv(".env", override=True)

    print("S3 enabled:", object_storage.is_enabled())
    print("Bucket:", os.getenv("S3_BUCKET"))
    print("Region:", os.getenv("S3_REGION"))
    print("Env folder:", object_storage.get_env_prefix())

    if not object_storage.is_enabled():
        print("S3 is not enabled. Check bucket/region/credentials/IAM role.")
        return 1

    key_name = f"s3-connection-test-{uuid.uuid4().hex}.txt"
    module = object_storage.MODULE_IMPORTS
    payload = b"s3 connectivity test"
    file_obj = _FileLike(payload)

    result = object_storage.try_upload_stream(module, key_name, file_obj)
    if not result:
        print("Upload failed: try_upload_stream returned None.")
        return 2

    public_url, size = result
    print("Uploaded size:", size)
    print("Public URL:", public_url)

    deleted = object_storage.delete_object_by_public_url(public_url)
    print("Deleted test object:", deleted)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

