# Acceptance Criteria

## Baseline

- Kullanıcı tek bir frame veya section seçebilir.
- Selection yoksa açıklayıcı hata gösterilir.
- Baseline oluşturulduğunda node sayısı gösterilir.
- Baseline storage'a başarıyla yazılır.
- Aynı scope için yeniden baseline oluşturma açıkça kullanıcıya bildirilir.

## Scan

- Baseline yoksa scan çalışmaz.
- Değişiklik yoksa empty state gösterilir.
- Added node doğru grupta görünür.
- Removed node doğru grupta görünür.
- Desteklenen property değişiklikleri eski/yeni değerleriyle görünür.
- Aynı dosya iki kez tarandığında false-positive üretilmez.

## Performans

- Orta büyüklükte bir frame'de UI donmamalıdır.
- Tarama progress veya loading durumu göstermelidir.
- Hata oluşursa mevcut baseline silinmemelidir.

## Export

- Snapshot JSON indirilebilir.
- ChangeSet JSON indirilebilir.
- Export edilen JSON schemaVersion içerir.
- JSON tekrar parse edilebilir.

## Güvenlik

- Access token loglanmaz.
- Figma document içeriği kullanıcı aksiyonu olmadan harici servise gönderilmez.
