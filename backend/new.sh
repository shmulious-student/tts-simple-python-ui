curl -X POST http://localhost:8001/api/process-url \
-H "Content-Type: application/json" \
-d '{
  "url": "https://sports.walla.co.il/item/3777282",
  "target_lang": "he",
  "summary_level": "medium"
}'