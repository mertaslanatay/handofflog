# Glossary

- **Baseline:** Sonraki değişikliklerle karşılaştırılacak başlangıç snapshot'ı.
- **Snapshot:** Takip edilen Figma node'larının normalize edilmiş teknik temsili.
- **Diff:** İki snapshot arasındaki fark.
- **ChangeSet:** Added, removed ve modified değişikliklerin bütünü.
- **Scope:** Takip edilen frame, section veya node grubu.
- **Release:** Seçilmiş değişikliklerin ekip için yayınlanmış paketi.
- **Tracking ID:** Node yeniden düzenlense bile eşleştirmeye yardımcı olan plugin kimliği.
- **Breaking change:** Mevcut implementasyonu geçersiz kılabilecek değişiklik.
- **Acknowledgement:** Developer'ın değişikliği gördüğünü belirtmesi.
- **Impact seviyesi:** Bir değişikliğin etkisi — low / medium / high / breaking. Node impact'i, kind + property impact'lerinin maksimumudur.
- **Anlamlı değişiklik:** Release'e include edilmiş ve impact'i low'un üstünde (medium/high/breaking) olan değişiklik. Başarı metriklerinin birimi.
- **Re-baseline:** Aktif baseline'ın yerine yeni bir baseline alınması. Yıkıcı aksiyon; onay gerektirir.
- **Migration:** Eski schemaVersion'lı bir snapshot'ı güncel şemaya dönüştüren saf fonksiyon zinciri.
- **False positive:** Aslında değişmemiş bir node'un diff'te yanlışlıkla değişmiş görünmesi (gürültü).
- **Guardrail metrik:** Büyümeyi kovalarken ürün kalitesini koruyan (terk, false-positive, performans) izleme metriği.
