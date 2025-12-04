# Writeup: RSC Report Lab (CVE-2025-55182)

## Суть
- Используется React/ReactDOM/react-server-dom-webpack 19.2.0 (уязвимая версия без `hasOwnProperty` в `requireModule`).
- Сервер напрямую вызывает `decodeAction` на пользовательском multipart (`/formaction`).
- Легитимный server action `generateReport(projectId, format)` внутри вызывает `child_process.exec` с конкатенацией аргументов.
- CVE позволяет дернуть action и подменить аргументы — получаем RCE без UI/авторизации.

## Файлы
- `server.js` — HTTP-сервер, манифест публикует только `app/server-actions#generateReport`.
- `app/server-actions.js` — бизнес-гаджет (генерация отчёта), внутри `exec`.
- `scripts/report.js` — макет отчёта, печатает аргументы.
- `package.json` — уязвимые версии.

## Эксплуатация
1. Запуск:
   ```bash
   npm install
   npm run start   # http://localhost:3002
   ```
2. Отправить multipart на `/formaction`:
   - `$ACTION_REF_0` = `""`
   - `$ACTION_0:0` = `{"id":"app/server-actions#generateReport","bound":["acme","pdf & whoami"]}`
3. Ответ вернёт вывод `whoami`, т.к. `format` ушёл в shell-строку `exec`.

## Почему это реально
- Нет лабораторного `vm`/`runCommand`; gadget — типичная “генерация отчётов” через `exec`.
- RSDW 19.2.0 без фикса → `decodeAction` доверяет входу, можно вызвать action/подменить args.
- Протокол RSC: сервер ожидает `$ACTION_*`, поэтому запрос обходится без UI и без auth.

## Что менять на проде
- Обновиться до React/RSDW ≥ 19.2.1 (hasOwnProperty-проверка).
- Убрать `exec` со строковой конкатенацией; использовать `spawn` с массивом аргументов или белый список форматов.
- Закрыть `/formaction` (middleware/auth), если фреймворк не патчен.
