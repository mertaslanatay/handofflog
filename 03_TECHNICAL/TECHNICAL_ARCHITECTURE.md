# Technical Architecture

## 1. İlk prototip mimarisi

### Plugin main
- Figma document API erişimi
- Selection okuma
- Snapshot üretimi
- Storage
- UI mesajlaşması

### Plugin UI
- React
- State management
- Tarama ve sonuç görünümü
- JSON export/import
- Release formu

### Shared core
- Snapshot schema
- Normalizer
- Hash generator
- Node matcher
- Property comparator
- Diff classifier
- Human-readable formatter

## 2. Önerilen monorepo

```text
apps/
  figma-plugin/
  web/
packages/
  diff-engine/
  schemas/
  ui/
  config/
```

İlk fazda yalnızca:

```text
src/
  plugin/
  ui/
  core/
  shared/
```

yeterlidir.

## 3. Veri akışı

Figma Selection
→ Node Traversal
→ Property Normalization
→ Stable Serialization
→ Hash
→ Snapshot Storage
→ Current Snapshot
→ Node Matching
→ Property Diff
→ Change Classification
→ UI Presentation

## 4. Kritik tasarım kararları

- Figma API objeleri doğrudan storage'a yazılmaz.
- Mixed, symbol ve readonly değerler normalize edilir.
- Snapshot schema version içerir.
- Hash için property sıralaması sabittir.
- Büyük binary görseller snapshot içine gömülmez.
- Diff motoru Figma API'den bağımsız saf TypeScript olmalıdır.
- Plugin main ve iframe sadece typed message contract ile haberleşmelidir.

## 5. Sonraki ekip mimarisi

- Next.js web app
- PostgreSQL
- Object storage
- OAuth
- Release API
- Notification worker
- Audit log

Backend ilk teknik prototipin ön koşulu değildir.
