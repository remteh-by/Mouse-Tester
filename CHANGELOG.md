# Изменения

## 1.2.0 preview

Новый графитовый интерфейс, компактная навигация и прозрачная оригинальная мышь с подсветкой нажатий. Исправлен подсчёт одновременных кнопок и очистка состояния при потере фокуса. Внешняя таблица стилей визуализации работает с существующей CSP без ослабления политики. Добавлена добровольная поддержка RemTeh через Ko-fi и приглашение после полезного действия, скрываемое на 30 дней. Формат 1.1 отчётов остаётся читаемым.

# 1.1.0 candidate · 2026-10-30

- Shared measurement session survives tab changes and keeps cumulative counts separate from the bounded raw trace.
- Browser event frequency starts unmeasured; controlled click/wheel tests distinguish suspected repeats from intentional double clicks and trackpad behavior.
- Local history, validated JSON comparison and print/PDF report work without AI. A failed local save preserves the current session.
- One managed audio context, explicit sound toggle and pause/reset behavior.
- Optional AI requires explicit consent and operator access; bounded request size, rate, daily count, concurrency, timeout and response size. No secrets in frontend assets and no paid call during QA.
- Production frontend/backend are packaged separately. Type, unit/API and browser checks are automated in CI.

No production deployment or physical mouse diagnosis is claimed. Main measurements work offline after the page has loaded; cold-start offline/PWA caching is a future feature.
