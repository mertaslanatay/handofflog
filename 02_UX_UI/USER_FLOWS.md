# User Flows

## Flow A — İlk handoff

1. Plugin açılır.
2. Kullanıcı frame veya section seçer.
3. `Create Baseline` seçilir.
4. Plugin selection doğrulaması yapar.
5. Node ağacı normalize edilir.
6. Snapshot kaydedilir.
7. Başarılı durum ve snapshot özeti gösterilir.

## Flow B — Değişiklik taraması

1. Kullanıcı baseline bulunan scope'u açar.
2. `Scan Changes` seçilir.
3. Mevcut snapshot oluşturulur.
4. Hash karşılaştırması yapılır.
5. Değişen node'larda property diff çalışır.
6. Added, removed ve modified sonuçları gruplanır.
7. Kullanıcı değişiklikleri release'e dahil eder veya çıkarır.

## Flow C — Release yayınlama

1. Kullanıcı seçilmiş farkları inceler.
2. Release adı ve version girer.
3. Etki seviyesi belirler.
4. Açıklama ekler.
5. Release yayınlanır.
6. Snapshot yeni baseline olur.
7. Release JSON'u kaydedilir.

## Flow D — Hata durumları

- Selection yok
- Desteklenmeyen node
- Baseline yok
- Snapshot parse edilemiyor
- Storage kotası dolu
- Çok büyük scope
- Figma mixed property
- Font erişim hatası

Her hata:
- Ne olduğunu söyler.
- Kullanıcının verisini korur.
- Tekrar denenebilir aksiyon sunar.
