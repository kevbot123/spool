#!/bin/bash

# Test script for the collection item import API

COLLECTION_SLUG="blog"
FILE_PATH="./test-import.csv"
MAPPING='{"title":"title","body_markdown":"body_markdown","tags":"tags"}'
URL="http://localhost:3000/api/admin/content/${COLLECTION_SLUG}/import"

# Check if the file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: Test CSV file not found at $FILE_PATH" >&2
    exit 1
fi

# Make the curl request
curl -v -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@${FILE_PATH}" \
  -F "mapping=${MAPPING}" \
  "$URL" \
  | jq ."\n\nHTTP Status: %{http_code}\n"
