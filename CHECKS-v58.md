# Проверки пакета v58

## Сборка исходников

```text
37 CSS -> site.d01fd85005.css (215 KB)
18 JS  -> site.1ece53f738.js (211 KB)
31 production assets (4987 KB); source originals preserved
```

## Синтаксис итогового JavaScript

```text
node --check — OK
```

## test_mobile_viewport.cjs

```text
Mobile viewport: browser bars, stable progress, rotation, native parallax and desktop preservation passed.
```

## test_scroll_handoff.cjs

```text
Scroll handoff: 27 native, mobile, hash-restoration, field-edge, bottom-reversal, keyboard and paused-page scenarios passed.
```

## test_scene_widgets.cjs

```text
PASS: 12 layouts, 8892 forward samples and matching reverse samples; distinct photo shapes, readable holds, shared transition paths, gallery, boundaries and hash stops.
```

## Повторная сборка

```text
Имена и содержимое итоговых CSS/JS совпали — OK
```

## Локальные ресурсы сборки

```text
Ссылки на ресурсы разрешаются в dist/ — OK
```

## Основной проект

```text
127 хешей src/ и dist/ не изменились
```

В браузере проверена мобильная проба: три точки находятся сверху по центру,
пауза скрыта; нажатия и стрелки синхронизируют активный кадр.
Физические iPhone/Android этой проверкой не охвачены.
