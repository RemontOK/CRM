# CRM Style Map

Где править внешний вид проекта быстро и предсказуемо:

## 1. Базовые токены
Файл: `src/styles/tokens.ts`

Тут лежат:
- `crmColors` — основные цвета интерфейса
- `crmRadius` — все скругления
- `crmShadow` — тени
- `crmGradients` — фоны и hero-блоки

Если нужно сделать весь продукт строже, мягче, светлее или темнее, начинать нужно отсюда.

## 2. Общие layout-стили
Файл: `src/styles/ui.ts`

Тут лежат:
- `pageShellSx`
- `heroCardSx`
- `panelCardSx`
- `toolbarCardSx`
- `pageHeaderSx`
- `pageTitleSx`

Эти стили отвечают за каркас страниц.

## 3. Повторяемые UI-рецепты
Файл: `src/styles/recipes.ts`

Тут лежат готовые блоки:
- `statCardSx`
- `metricValueSx`
- `metricIconWrapSx`
- `tableShellSx`
- `filterBarSx`
- `dialogPanelSx`
- `sectionCardSx`

Если нужно быстро унифицировать карточки, фильтры, таблицы и диалоги, использовать нужно этот файл.

## 4. Глобальная тема MUI
Файл: `src/theme.ts`

Тут настраиваются:
- кнопки
- карточки
- drawer
- text field
- chip
- app bar
- глобальные CSS variables

## 5. Глобальный CSS
Файл: `src/index.css`

Тут лучше держать только:
- reset
- scrollbars
- базовые переменные
- редкие глобальные utility-классы

## 6. Быстрые CSS-классы
Файл: `src/styles/utilities.css`

Если тебе неудобно править `sx` и TS-объекты, смотри сюда.

Тут лежат:
- `.crm-page-shell`
- `.crm-page-header`
- `.crm-page-title`
- `.crm-panel`
- `.crm-toolbar`
- `.crm-stat-card`
- `.crm-muted`

## Правило
Не добавляй новые тяжелые inline `sx`, если тот же стиль может жить в `ui.ts` или `recipes.ts`.
